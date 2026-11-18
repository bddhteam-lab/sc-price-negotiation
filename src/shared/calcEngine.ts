import {
  CalcBreakdown,
  CalcErrorResult,
  CalcInput,
  CalcResult,
  CalcUnitParams,
  DEFAULT_PROJECT_CONFIG_VALUES,
  DealStatus,
  ProjectCalcSettings,
} from './types';

const STATUS_LABELS: Record<DealStatus, string> = {
  pass: 'ผ่าน',
  approval: 'ต้องขออนุมัติ',
  fail: 'ไม่ผ่าน',
};

/**
 * Resolves project calculation settings with P'Nat's confirmed defaults.
 */
export function resolveProjectCalcSettings(
  project?: Partial<ProjectCalcSettings>,
): ProjectCalcSettings {
  return {
    kFactor: project?.kFactor ?? DEFAULT_PROJECT_CONFIG_VALUES.kFactor,
    vatPct: project?.vatPct ?? DEFAULT_PROJECT_CONFIG_VALUES.vatPct,
    defaultVariance:
      project?.defaultVariance ?? DEFAULT_PROJECT_CONFIG_VALUES.defaultVariance,
    priceRoundStep:
      project?.priceRoundStep ?? DEFAULT_PROJECT_CONFIG_VALUES.priceRoundStep,
    comStepPct: project?.comStepPct ?? DEFAULT_PROJECT_CONFIG_VALUES.comStepPct,
  };
}

/**
 * Computes actual commission cost rate as a fraction: (comPct / 100) * VAT * K.
 */
export function actualComCostRate(
  comPct: number,
  vatPct: number = DEFAULT_PROJECT_CONFIG_VALUES.vatPct,
  kFactor: number = DEFAULT_PROJECT_CONFIG_VALUES.kFactor,
): number {
  const vatMultiplier = 1 + vatPct / 100;
  return (comPct / 100) * vatMultiplier * kFactor;
}

/**
 * Runs guard checks on a unit before allowing calculation.
 */
export function validateUnitForCalc(unit: CalcUnitParams): CalcErrorResult | null {
  if (unit.isBlocked === true) {
    return {
      ok: false,
      errorCode: 'UNIT_BLOCKED',
      errorMessage:
        unit.blockReason || 'ห้องนี้ถูกระงับไม่ให้ใช้สูตรคำนวณตามกฎของโครงการ',
    };
  }

  if (
    unit.sgpCost === null ||
    unit.sgpCost === undefined ||
    !Number.isFinite(unit.sgpCost) ||
    unit.sgpCost <= 0
  ) {
    return {
      ok: false,
      errorCode: 'MISSING_SGP_COST',
      errorMessage:
        'ไม่พบข้อมูลต้นทุน (ช่อง O) หรือต้นทุนเป็น 0 ไม่สามารถคำนวณได้',
    };
  }

  if (!Number.isFinite(unit.commonFee1Y) || unit.commonFee1Y < 0) {
    return {
      ok: false,
      errorCode: 'INVALID_INPUT',
      errorMessage: 'ค่าส่วนกลางรายปีของห้องไม่ถูกต้อง',
    };
  }

  return null;
}

function classifyDealStatus(remainingExact: number, variance: number): DealStatus {
  if (remainingExact < 0) {
    return 'fail';
  }
  if (remainingExact < variance) {
    return 'approval';
  }
  return 'pass';
}

/**
 * Pure deterministic price negotiation calculation engine (Modes A, B, C).
 */
export function calculateDeal(input: CalcInput): CalcResult {
  const guardError = validateUnitForCalc(input.unit);
  if (guardError) {
    return guardError;
  }

  const settings = resolveProjectCalcSettings(input.project);
  const sgpCost = input.unit.sgpCost as number;
  const freeCommonYears = input.freeCommonYears ?? 0;
  const extraPromo = input.extraPromo ?? 0;
  const variance = input.variance ?? settings.defaultVariance;

  if (
    !Number.isFinite(freeCommonYears) ||
    freeCommonYears < 0 ||
    !Number.isFinite(extraPromo) ||
    extraPromo < 0 ||
    !Number.isFinite(variance) ||
    variance < 0 ||
    !Number.isFinite(settings.kFactor) ||
    settings.kFactor <= 0 ||
    !Number.isFinite(settings.vatPct) ||
    settings.vatPct < 0 ||
    !Number.isFinite(settings.priceRoundStep) ||
    settings.priceRoundStep <= 0 ||
    !Number.isFinite(settings.comStepPct) ||
    settings.comStepPct <= 0
  ) {
    return {
      ok: false,
      errorCode: 'INVALID_INPUT',
      errorMessage: 'พารามิเตอร์การคำนวณไม่ถูกต้อง',
    };
  }

  const vatMultiplier = 1 + settings.vatPct / 100;
  const k = settings.kFactor;
  const freeCommonAddition = freeCommonYears * input.unit.commonFee1Y;
  const minRequiredAmount =
    sgpCost + (extraPromo + freeCommonAddition + variance) * k;

  let sellingPrice = 0;
  let effectiveCommissionPct = 0;

  let diffFromAgentPrice: number | undefined;
  let diffFromAgentPct: number | undefined;

  let ceilingPct: number | undefined;
  let rawAgentComPct: number | undefined;
  let canGiveCommission: boolean | undefined;
  let nextStepComPct: number | undefined;
  let nextStepActualCostPct: number | undefined;
  let nextStepExcessPct: number | undefined;

  if (input.mode === 'A') {
    if (
      input.commissionPct === undefined ||
      !Number.isFinite(input.commissionPct) ||
      input.commissionPct < 0
    ) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุค่าคอม Agent (%) ให้ถูกต้อง',
      };
    }

    const comRate = actualComCostRate(
      input.commissionPct,
      settings.vatPct,
      settings.kFactor,
    );
    if (comRate >= 1) {
      return {
        ok: false,
        errorCode: 'COMMISSION_RATE_TOO_HIGH',
        errorMessage: 'อัตราค่าคอมมิชชั่นรวม VAT และค่า K ต้องน้อยกว่า 100%',
      };
    }

    const rawPrice = minRequiredAmount / (1 - comRate);
    sellingPrice =
      Math.ceil(rawPrice / settings.priceRoundStep) * settings.priceRoundStep;
    effectiveCommissionPct = input.commissionPct;

    if (
      input.unit.agentNetPrice !== null &&
      input.unit.agentNetPrice !== undefined &&
      Number.isFinite(input.unit.agentNetPrice) &&
      input.unit.agentNetPrice > 0
    ) {
      diffFromAgentPrice = input.unit.agentNetPrice - sellingPrice;
      diffFromAgentPct =
        ((input.unit.agentNetPrice - sellingPrice) / input.unit.agentNetPrice) *
        100;
    }
  } else if (input.mode === 'B') {
    if (
      input.sellingPrice === undefined ||
      !Number.isFinite(input.sellingPrice) ||
      input.sellingPrice <= 0
    ) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุราคาขายให้ถูกต้อง',
      };
    }

    sellingPrice = input.sellingPrice;
    const ceilingFraction = (sellingPrice - minRequiredAmount) / sellingPrice;
    ceilingPct = ceilingFraction * 100;
    rawAgentComPct = ceilingPct / (vatMultiplier * k);

    if (rawAgentComPct < 0) {
      effectiveCommissionPct = 0;
      canGiveCommission = false;
      nextStepComPct = settings.comStepPct;
    } else {
      effectiveCommissionPct =
        Math.floor((rawAgentComPct + 1e-9) / settings.comStepPct) *
        settings.comStepPct;
      canGiveCommission = true;
      nextStepComPct = effectiveCommissionPct + settings.comStepPct;
    }

    nextStepActualCostPct = nextStepComPct * vatMultiplier * k;
    nextStepExcessPct = nextStepActualCostPct - ceilingPct;
  } else {
    if (
      input.sellingPrice === undefined ||
      !Number.isFinite(input.sellingPrice) ||
      input.sellingPrice <= 0 ||
      input.commissionPct === undefined ||
      !Number.isFinite(input.commissionPct) ||
      input.commissionPct < 0
    ) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุราคาขายและค่าคอม Agent (%) ให้ถูกต้อง',
      };
    }

    sellingPrice = input.sellingPrice;
    effectiveCommissionPct = input.commissionPct;
  }

  const effectiveComRate = actualComCostRate(
    effectiveCommissionPct,
    settings.vatPct,
    settings.kFactor,
  );
  const commissionAmountExact = sellingPrice * effectiveComRate;
  const remainingExact =
    sellingPrice -
    commissionAmountExact -
    sgpCost -
    extraPromo -
    freeCommonAddition;
  const remainingVariance = Math.round(remainingExact);
  const status = classifyDealStatus(remainingExact, variance);

  const breakdown: CalcBreakdown = {
    sellingPrice: Math.round(sellingPrice),
    commissionPct: effectiveCommissionPct,
    effectiveComRatePct: Number((effectiveComRate * 100).toFixed(2)),
    commissionAmount: Math.round(commissionAmountExact),
    sgpPlusCost: Math.round(sgpCost),
    freeCommonYears,
    freeCommonAmount: Math.round(freeCommonAddition),
    extraPromoAmount: Math.round(extraPromo),
    remainingVariance,
  };

  return {
    ok: true,
    mode: input.mode,
    status,
    statusLabel: STATUS_LABELS[status],
    sellingPrice,
    effectiveCommissionPct,
    remainingVariance,
    remainingExact,
    varianceThreshold: variance,
    minRequiredAmount,
    breakdown,
    ...(diffFromAgentPrice !== undefined ? { diffFromAgentPrice } : {}),
    ...(diffFromAgentPct !== undefined ? { diffFromAgentPct } : {}),
    ...(ceilingPct !== undefined ? { ceilingPct } : {}),
    ...(rawAgentComPct !== undefined ? { rawAgentComPct } : {}),
    ...(canGiveCommission !== undefined ? { canGiveCommission } : {}),
    ...(nextStepComPct !== undefined ? { nextStepComPct } : {}),
    ...(nextStepActualCostPct !== undefined ? { nextStepActualCostPct } : {}),
    ...(nextStepExcessPct !== undefined ? { nextStepExcessPct } : {}),
  };
}
