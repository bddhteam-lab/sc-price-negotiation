import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiService } from '../../server/apiService';
import { createInitialDeals, createInitialUsers } from '../../server/seedStore';
import { parsePriceListWorkbook } from '../priceListImporter';
import {
  AdminGetProjectVersionsData,
  AdminPublishUnitsData,
  CalcComputeData,
  CatalogBootstrapData,
  UnitRecord,
  UnitsGetData,
  UnitsSearchData,
} from '../types';

const EXCEL_PATH = resolve(
  process.cwd(),
  'price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx',
);

const ADMIN_EMAIL = 'bddhteam@gmail.com';
const SALES_EMAIL = 'sales@scasset.com';

describe('End-to-End SC Price Negotiation Workflow', () => {
  it('completes full Excel import -> 4 P’Nat calc.compute cases -> Sales zero-leak vs Admin SGP -> dynamic project -> v1/v2 versioning -> blocked unit guard', async () => {
    // 1. Full import of real Excel workbook -> 7 projects, 3,714 units
    const buffer = new Uint8Array(readFileSync(EXCEL_PATH));
    const parsed = parsePriceListWorkbook(buffer, {
      priceVersion: 1,
      isActiveVersion: true,
    });
    expect(parsed.projects).toHaveLength(7);
    expect(parsed.units).toHaveLength(3714);

    const api = new ApiService({
      projects: parsed.projects,
      units: parsed.units,
      users: createInitialUsers(),
      deals: createInitialDeals(),
      allowDevAuth: true,
    });

    // 2. All 4 mandatory P'Nat calculation test cases via calc.compute API
    const case1 = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'CORM9',
        unitCode: 'B0407',
        mode: 'A',
        commissionPct: 2,
        freeCommonYears: 1,
        extraPromo: 0,
      },
    });
    expect(case1.ok).toBe(true);
    if (case1.ok) {
      const { result } = case1.data as CalcComputeData;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.sellingPrice).toBe(2500000);
        expect(result.remainingVariance).toBe(58718);
        expect(result.status).toBe('pass');
      }
    }

    const case2 = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'CORM9',
        unitCode: 'B0407',
        mode: 'A',
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 0,
      },
    });
    expect(case2.ok).toBe(true);
    if (case2.ok) {
      const { result } = case2.data as CalcComputeData;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.sellingPrice).toBe(2480000);
        expect(result.remainingVariance).toBe(55600);
        expect(result.breakdown.commissionAmount).toBe(55513);
        expect(result.breakdown.sgpPlusCost).toBe(2368887);
      }
    }

    const case3 = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'CORM9',
        unitCode: 'B0407',
        mode: 'B',
        sellingPrice: 2500000,
        freeCommonYears: 1,
        extraPromo: 0,
      },
    });
    expect(case3.ok).toBe(true);
    if (case3.ok) {
      const { result } = case3.data as CalcComputeData;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Number(result.ceilingPct!.toFixed(2))).toBe(2.46);
        expect(result.effectiveCommissionPct).toBe(2);
        expect(result.nextStepComPct).toBe(3);
        expect(result.remainingVariance).toBe(58718);
      }
    }

    const case4 = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'CORM9',
        unitCode: 'E0408',
        mode: 'C',
        sellingPrice: 2690000,
        commissionPct: 3,
        freeCommonYears: 0,
        extraPromo: 0,
      },
    });
    expect(case4.ok).toBe(true);
    if (case4.ok) {
      const { result } = case4.data as CalcComputeData;
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.remainingVariance).toBe(331832);
        expect(result.status).toBe('pass');
      }
    }

    // 3. Sales login -> zero sgp (M) or sgpCost (O) leakage vs Admin login -> receives M and O
    const salesBoot = await api.handleRequest({
      action: 'catalog.bootstrap',
      devEmail: SALES_EMAIL,
    });
    const salesSearch = await api.handleRequest({
      action: 'units.search',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'CORM9', query: 'B0407', limit: 10 },
    });
    const salesGet = await api.handleRequest({
      action: 'units.get',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'CORM9', unitCode: 'B0407' },
    });

    const salesSerialized = JSON.stringify([salesBoot, salesSearch, salesGet]);
    expect(salesSerialized).not.toContain('sgp');
    expect(salesSerialized).not.toContain('sgpCost');
    expect(salesSerialized).not.toContain('totalCostExpense');
    expect(salesSerialized).not.toContain('2326000');
    expect(salesSerialized).not.toContain('2368887');

    const adminGet = await api.handleRequest({
      action: 'units.get',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'CORM9', unitCode: 'B0407' },
    });
    expect(adminGet.ok).toBe(true);
    if (adminGet.ok) {
      const adminUnit = (adminGet.data as UnitsGetData).unit as UnitRecord;
      expect(adminUnit.sgp).toBe(2326000);
      expect(adminUnit.sgpCost).toBeCloseTo(2368887.046, 3);
    }

    // 4. Admin adds TEST01 dynamically -> sales sees TEST01 in catalog.bootstrap immediately
    const upsertProj = await api.handleRequest({
      action: 'admin.upsertProject',
      devEmail: ADMIN_EMAIL,
      payload: {
        project: {
          projectCode: 'TEST01',
          projectName: 'E2E Test Project',
          status: 'กำลังก่อสร้าง',
        },
      },
    });
    expect(upsertProj.ok).toBe(true);

    const salesBootAfter = await api.handleRequest({
      action: 'catalog.bootstrap',
      devEmail: SALES_EMAIL,
    });
    expect(salesBootAfter.ok).toBe(true);
    if (salesBootAfter.ok) {
      const bootData = salesBootAfter.data as CatalogBootstrapData;
      expect(bootData.projects).toHaveLength(8);
      expect(bootData.projects.some((p) => p.projectCode === 'TEST01')).toBe(
        true,
      );
    }

    // 5. Admin publishes v2 units for RFS63 -> version increments v1 -> v2 & v1 remains viewable
    const rfsParsed = parsePriceListWorkbook(buffer, { projectCode: 'RFS63' });
    const v2Units = rfsParsed.units.slice(0, 5).map((u) => ({
      ...u,
      scPrice: (u.scPrice ?? 3000000) + 100000,
    }));
    const publishRes = await api.handleRequest({
      action: 'admin.publishUnits',
      devEmail: ADMIN_EMAIL,
      payload: {
        targetProjectCode: 'RFS63',
        units: v2Units,
      },
    });
    expect(publishRes.ok).toBe(true);
    if (publishRes.ok) {
      expect((publishRes.data as AdminPublishUnitsData).versions.RFS63).toBe(2);
    }

    const rfsSearch = await api.handleRequest({
      action: 'units.search',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'RFS63', limit: 100 },
    });
    expect(rfsSearch.ok).toBe(true);
    if (rfsSearch.ok) {
      expect((rfsSearch.data as UnitsSearchData).total).toBe(5);
    }

    const v1History = await api.handleRequest({
      action: 'admin.getProjectVersions',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'RFS63', version: 1 },
    });
    expect(v1History.ok).toBe(true);
    if (v1History.ok) {
      const hist = v1History.data as AdminGetProjectVersionsData;
      expect(hist.versions.map((v) => v.version)).toEqual([2, 1]);
      expect(hist.units).toHaveLength(347);
    }

    // 6. Blocked units (Decoration "ห้ามขาย" & COLS SHOP1) refuse calculation
    const blockedShop = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'COLS',
        unitCode: 'SHOP1',
        mode: 'A',
        commissionPct: 2,
      },
    });
    expect(blockedShop.ok).toBe(true);
    if (blockedShop.ok) {
      const { result } = blockedShop.data as CalcComputeData;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe('UNIT_BLOCKED');
      }
    }

    const blockedDecoUnit = parsed.units.find(
      (u) => u.unitStatus === 'ห้ามขาย' && u.isBlocked,
    );
    expect(blockedDecoUnit).toBeDefined();
    const blockedDecoCalc = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: blockedDecoUnit!.projectCode,
        unitCode: blockedDecoUnit!.unitCode,
        mode: 'A',
        commissionPct: 2,
      },
    });
    expect(blockedDecoCalc.ok).toBe(true);
    if (blockedDecoCalc.ok) {
      const { result } = blockedDecoCalc.data as CalcComputeData;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe('UNIT_BLOCKED');
      }
    }
  });
});
