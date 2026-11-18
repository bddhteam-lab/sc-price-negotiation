import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { calculateDeal } from '../calcEngine';
import {
  getDefaultBlockedDecorations,
  isDefaultBlockedDecoration,
  parsePriceListWorkbook,
} from '../priceListImporter';
import { ImportResult } from '../types';

const EXCEL_PATH = resolve(
  process.cwd(),
  'price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx',
);

let rawBuffer: Uint8Array;
let fullImport: ImportResult;
let parseElapsedMs: number;

beforeAll(() => {
  rawBuffer = new Uint8Array(readFileSync(EXCEL_PATH));
  const t0 = performance.now();
  fullImport = parsePriceListWorkbook(rawBuffer);
  parseElapsedMs = performance.now() - t0;
});

describe('priceListImporter', () => {
  it('parses the real Excel PriceList workbook quickly (< 5s) with all 7 projects and 3,714 units', () => {
    expect(parseElapsedMs).toBeLessThan(5000);
    expect(fullImport.projects).toHaveLength(7);
    expect(fullImport.units).toHaveLength(3714);
    expect(fullImport.report.importedUnitsCount).toBe(3714);
    expect(fullImport.report.projectCount).toBe(7);

    const countByProject = Object.fromEntries(
      fullImport.projects.map((p) => [p.projectCode, p.unitCount]),
    );
    expect(countByProject).toEqual({
      COLS: 671,
      CORM9: 1500,
      COKS: 399,
      RFWY: 287,
      STS20: 123,
      RFKS: 387,
      RFS63: 347,
    });
  });

  it('parses ArrayBuffer inputs identically to Uint8Array', () => {
    const arrayBuffer = new Uint8Array(rawBuffer).buffer;
    const result = parsePriceListWorkbook(arrayBuffer, { projectCode: 'STS20' });
    expect(result.units).toHaveLength(123);
    expect(result.projects[0]?.projectCode).toBe('STS20');
  });

  it('computes T, V, X for all 857 units in STS20 (123), RFKS (387), and RFS63 (347)', () => {
    expect(fullImport.report.missingExpenseColsCount).toBe(857);

    const targetUnits = fullImport.units.filter((u) =>
      ['STS20', 'RFKS', 'RFS63'].includes(u.projectCode),
    );
    expect(targetUnits).toHaveLength(857);

    for (const unit of targetUnits) {
      expect(unit.transferFee).toBeGreaterThan(0);
      expect(unit.sinkingFund).toBeGreaterThan(0);
      expect(unit.commonFee1Y).toBeGreaterThan(0);
    }
  });

  it('filters single project RFS63 with 347 units, zero duplicates/missing SGP, and trimmed roomCategory', () => {
    const rfs63 = parsePriceListWorkbook(rawBuffer, { projectCode: 'RFS63' });

    expect(rfs63.units).toHaveLength(347);
    expect(rfs63.projects).toHaveLength(1);
    expect(rfs63.report.duplicateCount).toBe(0);
    expect(rfs63.report.missingSgpCount).toBe(0);
    expect(rfs63.report.missingSgpCostCount).toBe(0);
    expect(rfs63.report.missingExpenseColsCount).toBe(347);
    expect(rfs63.report.trimmedRoomTypeCount).toBe(347);

    for (const unit of rfs63.units) {
      expect(unit.projectCode).toBe('RFS63');
      expect(unit.roomCategory).toBeDefined();
      expect(unit.roomCategory).toBe(unit.roomCategory!.trim());
      expect(unit.transferFee).toBeGreaterThan(0);
      expect(unit.sinkingFund).toBeGreaterThan(0);
      expect(unit.commonFee1Y).toBeGreaterThan(0);
    }
  });

  it('handles COLS SHOP1 & SHOP2 missing prices and zero SGP/O as ยังไม่มีราคา and blocked', () => {
    const shopUnits = fullImport.units.filter(
      (u) =>
        u.projectCode === 'COLS' &&
        (u.unitCode === 'SHOP1' || u.unitCode === 'SHOP2'),
    );
    expect(shopUnits).toHaveLength(2);

    for (const shop of shopUnits) {
      expect(shop.scPrice).toBeNull();
      expect(shop.agentNetPrice).toBeNull();
      expect(shop.sgp).toBe(0);
      expect(shop.sgpCost).toBe(0);
      expect(shop.unitStatus).toBe('ยังไม่มีราคา');
      expect(shop.isBlocked).toBe(true);

      const calc = calculateDeal({
        mode: 'A',
        unit: shop,
        commissionPct: 2,
      });
      expect(calc.ok).toBe(false);
    }
  });

  it('handles CORM9 SH101–SH106 with scPrice = null and agentNetPrice > 0', () => {
    const shCodes = ['SH101', 'SH102', 'SH103', 'SH104', 'SH105', 'SH106'];
    const shUnits = fullImport.units.filter(
      (u) => u.projectCode === 'CORM9' && shCodes.includes(u.unitCode),
    );
    expect(shUnits).toHaveLength(6);

    for (const unit of shUnits) {
      expect(unit.scPrice).toBeNull();
      expect(unit.agentNetPrice).not.toBeNull();
      expect(unit.agentNetPrice!).toBeGreaterThan(0);
    }
  });

  it('summarizes project rate displays accurately including COKS 70–85', () => {
    const coks = fullImport.projects.find((p) => p.projectCode === 'COKS');
    const corm9 = fullImport.projects.find((p) => p.projectCode === 'CORM9');

    expect(coks?.sinkingRateDisplay).toBe('500');
    expect(coks?.commonFeeRateDisplay).toBe('70–85');

    expect(corm9?.sinkingRateDisplay).toBe('500');
    expect(corm9?.commonFeeRateDisplay).toBe('55');
  });

  it('feeds parsed CORM9 B0407 and E0408 units directly into calculateDeal and reproduces exact Phase 0 results', () => {
    const b0407 = fullImport.units.find(
      (u) => u.projectCode === 'CORM9' && u.unitCode === 'B0407',
    );
    const e0408 = fullImport.units.find(
      (u) => u.projectCode === 'CORM9' && u.unitCode === 'E0408',
    );

    expect(b0407).toBeDefined();
    expect(e0408).toBeDefined();

    // Case 1: B0407 Mode A, com 2%, freeCommon 1y
    const case1 = calculateDeal({
      mode: 'A',
      unit: b0407!,
      commissionPct: 2,
      freeCommonYears: 1,
      extraPromo: 0,
    });
    expect(case1.ok).toBe(true);
    if (case1.ok) {
      expect(case1.sellingPrice).toBe(2500000);
      expect(case1.remainingVariance).toBe(58718);
      expect(case1.status).toBe('pass');
    }

    // Case 2: B0407 Mode A, com 2%, freeCommon 0y
    const case2 = calculateDeal({
      mode: 'A',
      unit: b0407!,
      commissionPct: 2,
      freeCommonYears: 0,
      extraPromo: 0,
    });
    expect(case2.ok).toBe(true);
    if (case2.ok) {
      expect(case2.sellingPrice).toBe(2480000);
      expect(case2.remainingVariance).toBe(55600);
      expect(case2.breakdown.commissionAmount).toBe(55513);
      expect(case2.breakdown.sgpPlusCost).toBe(2368887);
    }

    // Case 3: B0407 Mode B, sellingPrice 2,500,000, freeCommon 1y
    const case3 = calculateDeal({
      mode: 'B',
      unit: b0407!,
      sellingPrice: 2500000,
      freeCommonYears: 1,
      extraPromo: 0,
    });
    expect(case3.ok).toBe(true);
    if (case3.ok) {
      expect(Number(case3.ceilingPct!.toFixed(2))).toBe(2.46);
      expect(case3.effectiveCommissionPct).toBe(2);
      expect(case3.remainingVariance).toBe(58718);
      expect(case3.status).toBe('pass');
    }

    // Case 4: E0408 Mode C, sellingPrice 2,690,000, com 3%, freeCommon 0y
    const case4 = calculateDeal({
      mode: 'C',
      unit: e0408!,
      sellingPrice: 2690000,
      commissionPct: 3,
      freeCommonYears: 0,
      extraPromo: 0,
    });
    expect(case4.ok).toBe(true);
    if (case4.ok) {
      expect(case4.remainingVariance).toBe(331832);
      expect(case4.status).toBe('pass');
    }
  });

  it('detects default blocked decorations and supports custom blockedDecorations with calculateDeal guard', () => {
    expect(isDefaultBlockedDecoration('Show Unit')).toBe(true);
    expect(isDefaultBlockedDecoration('Show unit / แต่งแพง Lot4')).toBe(true);
    expect(isDefaultBlockedDecoration('BACK OFFICE')).toBe(true);
    expect(isDefaultBlockedDecoration('Sale office')).toBe(true);
    expect(isDefaultBlockedDecoration('ห้องตัวอย่าง')).toBe(true);
    expect(isDefaultBlockedDecoration('ห้องรับรอง')).toBe(true);
    expect(isDefaultBlockedDecoration('ห้องปล่อยเช่า /ห้ามขาย')).toBe(true);
    expect(isDefaultBlockedDecoration('ห้องเก็บของ')).toBe(true);
    expect(isDefaultBlockedDecoration('Spare')).toBe(true);
    expect(isDefaultBlockedDecoration('Ready to move (Lot1)')).toBe(false);
    expect(isDefaultBlockedDecoration('แต่งห้องเพื่อขาย')).toBe(false);

    const defaultBlocked = getDefaultBlockedDecorations(
      fullImport.report.decorations.map((d) => d.text),
    );
    expect(defaultBlocked).toContain('BACK OFFICE');
    expect(defaultBlocked).not.toContain('แต่งห้องเพื่อขาย');

    const defaultShowUnit = fullImport.units.find(
      (u) => u.decoration === 'Show Unit',
    );
    expect(defaultShowUnit).toBeDefined();
    expect(defaultShowUnit?.isBlocked).toBe(true);
    expect(defaultShowUnit?.unitStatus).toBe('ห้ามขาย');

    // Custom blockedDecorations overrides default list
    const customImport = parsePriceListWorkbook(rawBuffer, {
      blockedDecorations: ['แต่งห้องเพื่อขาย'],
    });
    const blockedCustomUnit = customImport.units.find(
      (u) => u.decoration === 'แต่งห้องเพื่อขาย',
    );
    expect(blockedCustomUnit).toBeDefined();
    expect(blockedCustomUnit?.isBlocked).toBe(true);
    expect(blockedCustomUnit?.unitStatus).toBe('ห้ามขาย');

    const calc = calculateDeal({
      mode: 'A',
      unit: blockedCustomUnit!,
      commissionPct: 2,
    });
    expect(calc.ok).toBe(false);
    if (!calc.ok) {
      expect(calc.errorCode).toBe('UNIT_BLOCKED');
    }
  });
});
