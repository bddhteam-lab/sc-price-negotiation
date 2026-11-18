import { describe, expect, it } from 'vitest';
import { actualComCostRate, calculateDeal } from '../calcEngine';
import { CalcUnitParams, ProjectCalcSettings } from '../types';

const DEFAULT_PROJECT: ProjectCalcSettings = {
  kFactor: 1.046,
  vatPct: 7,
  defaultVariance: 50000,
  priceRoundStep: 10000,
  comStepPct: 1,
};

const CORM9_B0407: CalcUnitParams = {
  projectCode: 'CORM9',
  unitCode: 'B0407',
  sgpCost: 2368887.046,
  commonFee1Y: 16434,
  agentNetPrice: 3170000,
};

const CORM9_E0408: CalcUnitParams = {
  projectCode: 'CORM9',
  unitCode: 'E0408',
  sgpCost: 2267846.85,
  commonFee1Y: 16440.6,
  agentNetPrice: 2960000,
};

describe('calcEngine', () => {
  describe('Mandatory P’Nat Test Cases', () => {
    it('Case 1: CORM9 B0407 Mode A (com 2%, freeCommon 1y) -> 2,500,000 / remaining 58,718 / pass', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        commissionPct: 2,
        freeCommonYears: 1,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.sellingPrice).toBe(2500000);
      expect(result.remainingVariance).toBe(58718);
      expect(result.status).toBe('pass');
      expect(result.effectiveCommissionPct).toBe(2);
      expect(result.diffFromAgentPrice).toBe(670000);
      expect(result.diffFromAgentPct).toBeCloseTo((670000 / 3170000) * 100, 6);
      expect(result.breakdown).toEqual({
        sellingPrice: 2500000,
        commissionPct: 2,
        effectiveComRatePct: 2.24,
        commissionAmount: 55961,
        sgpPlusCost: 2368887,
        freeCommonYears: 1,
        freeCommonAmount: 16434,
        extraPromoAmount: 0,
        remainingVariance: 58718,
      });
    });

    it('Case 2: CORM9 B0407 Mode A (com 2%, freeCommon 0y) -> 2,480,000 / remaining 55,600 / com 55,513 / sgpCost 2,368,887', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.sellingPrice).toBe(2480000);
      expect(result.remainingVariance).toBe(55600);
      expect(result.status).toBe('pass');
      expect(result.diffFromAgentPrice).toBe(690000);
      expect(result.diffFromAgentPct).toBeCloseTo(21.76656, 4);
      expect(result.breakdown.commissionAmount).toBe(55513);
      expect(result.breakdown.sgpPlusCost).toBe(2368887);
      expect(result.breakdown.effectiveComRatePct).toBe(2.24);
      expect(result.breakdown.remainingVariance).toBe(55600);
    });

    it('Case 3: CORM9 B0407 Mode B (sellingPrice 2,500,000, freeCommon 1y) -> ceiling 2.46% / com 2% / next 3% (3.36%, excess 0.89%) / remaining 58,718', () => {
      const result = calculateDeal({
        mode: 'B',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2500000,
        freeCommonYears: 1,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.ceilingPct).toBeCloseTo(2.4649196, 5);
      expect(Number(result.ceilingPct!.toFixed(2))).toBe(2.46);
      expect(result.effectiveCommissionPct).toBe(2);
      expect(result.canGiveCommission).toBe(true);
      expect(result.nextStepComPct).toBe(3);
      expect(result.nextStepActualCostPct).toBeCloseTo(3.35766, 5);
      expect(Number(result.nextStepActualCostPct!.toFixed(2))).toBe(3.36);
      expect(Number(result.nextStepExcessPct!.toFixed(2))).toBe(0.89);
      expect(result.remainingVariance).toBe(58718);
      expect(result.status).toBe('pass');
    });

    it('Case 4: CORM9 E0408 Mode C (sellingPrice 2,690,000, com 3%, freeCommon 0y) -> remaining 331,832 / pass', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_E0408,
        project: DEFAULT_PROJECT,
        sellingPrice: 2690000,
        commissionPct: 3,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(331832);
      expect(result.status).toBe('pass');
      expect(result.breakdown.effectiveComRatePct).toBe(3.36);
      expect(result.breakdown.commissionAmount).toBe(90321);
      expect(result.breakdown.sgpPlusCost).toBe(2267847);
    });
  });

  describe('Mockup 03c & 04 Verification Cases', () => {
    it('Mockup 03c: CORM9 B0407 Mode C green deal (2,500,000, com 2%, freeCommon 0y) -> remaining 75,152 / pass', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2500000,
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(75152);
      expect(result.status).toBe('pass');
      expect(result.statusLabel).toBe('ผ่าน');
    });

    it('Mockup 04: CORM9 B0407 Mode C yellow deal (2,450,000, com 2%, freeCommon 1y) -> remaining 9,837 / approval', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2450000,
        commissionPct: 2,
        freeCommonYears: 1,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(9837);
      expect(result.status).toBe('approval');
      expect(result.statusLabel).toBe('ต้องขออนุมัติ');
    });

    it('Mode C yellow deal with freeCommon 0y (2,450,000, com 2%) -> remaining 26,271 / approval', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2450000,
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(26271);
      expect(result.status).toBe('approval');
    });

    it('Mockup 04: CORM9 B0407 Mode C red deal (2,400,000, com 2%, freeCommon 1y) -> remaining -39,044 / fail', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2400000,
        commissionPct: 2,
        freeCommonYears: 1,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(-39044);
      expect(result.status).toBe('fail');
      expect(result.statusLabel).toBe('ไม่ผ่าน');
    });

    it('Mode C red deal with freeCommon 0y (2,400,000, com 2%) -> remaining -22,610 / fail', () => {
      const result = calculateDeal({
        mode: 'C',
        unit: CORM9_B0407,
        project: DEFAULT_PROJECT,
        sellingPrice: 2400000,
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.remainingVariance).toBe(-22610);
      expect(result.status).toBe('fail');
    });
  });

  describe('Edge Cases & Helper Formulas', () => {
    it('actualComCostRate applies VAT 7% and K 1.046 by default', () => {
      expect(actualComCostRate(2)).toBeCloseTo(0.0223844, 10);
      expect(actualComCostRate(3)).toBeCloseTo(0.0335766, 10);
    });

    it('Mode B when rawAgentComPct < 0 sets effectiveCommissionPct = 0 and canGiveCommission = false', () => {
      const result = calculateDeal({
        mode: 'B',
        unit: CORM9_B0407,
        sellingPrice: 2380000,
        freeCommonYears: 0,
        extraPromo: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.rawAgentComPct).toBeLessThan(0);
      expect(result.canGiveCommission).toBe(false);
      expect(result.effectiveCommissionPct).toBe(0);
      expect(result.nextStepComPct).toBe(1);
      expect(result.remainingVariance).toBe(11113);
      expect(result.status).toBe('approval');
    });

    it('Mode A accounts for extraPromo and custom variance', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: CORM9_B0407,
        commissionPct: 2,
        freeCommonYears: 0,
        extraPromo: 30000,
        variance: 50000,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // minRequired = 2368887.046 + (30000 + 50000) * 1.046 = 2452567.046
      // rawPrice = 2452567.046 / (1 - 0.0223844) = 2508723.31 -> ceil 10k = 2,510,000
      expect(result.sellingPrice).toBe(2510000);
      expect(result.breakdown.extraPromoAmount).toBe(30000);
      expect(result.status).toBe('pass');
    });
  });

  describe('Guard Checks', () => {
    it('refuses calculation for a blocked unit (isBlocked: true)', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: {
          ...CORM9_B0407,
          projectCode: 'COLS',
          unitCode: 'SHOP1',
          isBlocked: true,
          blockReason: 'ห้อง SHOP1 ห้ามใช้สูตรคำนวณ',
        },
        commissionPct: 2,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errorCode).toBe('UNIT_BLOCKED');
      expect(result.errorMessage).toContain('SHOP1');
    });

    it('refuses calculation for zero sgpCost (e.g. COLS SHOP1)', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: {
          projectCode: 'COLS',
          unitCode: 'SHOP1',
          sgpCost: 0,
          commonFee1Y: 0,
        },
        commissionPct: 2,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.errorCode).toBe('MISSING_SGP_COST');
    });

    it('refuses calculation for null or undefined sgpCost', () => {
      const nullResult = calculateDeal({
        mode: 'C',
        unit: {
          projectCode: 'COLS',
          unitCode: 'A0101',
          sgpCost: null,
          commonFee1Y: 12000,
        },
        sellingPrice: 2000000,
        commissionPct: 2,
      });

      expect(nullResult.ok).toBe(false);
      if (!nullResult.ok) {
        expect(nullResult.errorCode).toBe('MISSING_SGP_COST');
      }

      const undefinedResult = calculateDeal({
        mode: 'B',
        unit: {
          projectCode: 'COLS',
          unitCode: 'A0101',
          sgpCost: undefined,
          commonFee1Y: 12000,
        },
        sellingPrice: 2000000,
      });

      expect(undefinedResult.ok).toBe(false);
      if (!undefinedResult.ok) {
        expect(undefinedResult.errorCode).toBe('MISSING_SGP_COST');
      }
    });

    it('refuses calculation when effective commission rate >= 100%', () => {
      const result = calculateDeal({
        mode: 'A',
        unit: CORM9_B0407,
        commissionPct: 90, // 90% * 1.07 * 1.046 = 100.73% >= 100%
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe('COMMISSION_RATE_TOO_HIGH');
      }
    });

    it('refuses calculation on invalid/missing mode inputs', () => {
      const missingPrice = calculateDeal({
        mode: 'B',
        unit: CORM9_B0407,
      });
      expect(missingPrice.ok).toBe(false);
      if (!missingPrice.ok) {
        expect(missingPrice.errorCode).toBe('INVALID_INPUT');
      }

      const missingCom = calculateDeal({
        mode: 'A',
        unit: CORM9_B0407,
      });
      expect(missingCom.ok).toBe(false);
      if (!missingCom.ok) {
        expect(missingCom.errorCode).toBe('INVALID_INPUT');
      }
    });
  });
});
