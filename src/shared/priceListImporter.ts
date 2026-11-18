import * as XLSX from 'xlsx';
import {
  ColumnMapping,
  DEFAULT_PROJECT_CONFIG_VALUES,
  DecorationSummaryItem,
  ImportOptions,
  ImportResult,
  ImportValidationReport,
  ProjectConfig,
  UnitRecord,
} from './types';

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  decoration: 'B',
  houseNumber: 'C',
  projectCode: 'D',
  unitCode: 'E',
  combineCode: 'F',
  building: 'G',
  floor: 'H',
  unitSuffix: 'I',
  unitType: 'J',
  roomCategory: 'K',
  areaSqm: 'L',
  sgp: 'M',
  totalCostExpense: 'N',
  sgpCost: 'O',
  scPrice: 'P',
  agentNetPrice: 'R',
  transferFee: 'T',
  sinkingRatePerSqm: 'U',
  sinkingFund: 'V',
  commonFeeRatePerSqmMonth: 'W',
  commonFee1Y: 'X',
};

const DEFAULT_BLOCKED_DECORATION_KEYWORDS = [
  'ห้ามขาย',
  'office',
  'ห้องตัวอย่าง',
  'show unit',
  'back office',
  'sale office',
  'ห้องรับรอง',
  'ห้องปล่อยเช่า',
  'ห้องเก็บของ',
  'spare',
] as const;

/**
 * Returns true if the given Decoration text matches any default non-sellable keyword.
 */
export function isDefaultBlockedDecoration(decoration: string): boolean {
  const normalized = decoration.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return DEFAULT_BLOCKED_DECORATION_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}

/**
 * Returns unique decoration texts from the provided list that are blocked by default.
 */
export function getDefaultBlockedDecorations(decorations: string[]): string[] {
  const result = new Set<string>();
  for (const raw of decorations) {
    const text = raw.trim();
    if (text && isDefaultBlockedDecoration(text)) {
      result.add(text);
    }
  }
  return [...result];
}

function normalizeColumnMapping(overrides?: Partial<ColumnMapping>): ColumnMapping {
  const merged = { ...DEFAULT_COLUMN_MAPPING, ...overrides };
  const normalized = {} as ColumnMapping;
  for (const key of Object.keys(merged) as Array<keyof ColumnMapping>) {
    normalized[key] = merged[key].trim().toUpperCase();
  }
  return normalized;
}

function getRawCellValue(
  ws: XLSX.WorkSheet,
  col: string,
  row: number,
): string | number | boolean | Date | undefined {
  if (!col) return undefined;
  const cell = ws[`${col}${row}`] as XLSX.CellObject | undefined;
  if (!cell || cell.v === undefined || cell.v === null) {
    return undefined;
  }
  return cell.v as string | number | boolean | Date;
}

function getRawString(
  ws: XLSX.WorkSheet,
  col: string,
  row: number,
): string | undefined {
  const v = getRawCellValue(ws, col, row);
  if (v === undefined) return undefined;
  const s = String(v);
  return s === '' ? undefined : s;
}

function getTrimmedString(
  ws: XLSX.WorkSheet,
  col: string,
  row: number,
): string | undefined {
  const raw = getRawString(ws, col, row);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function getCellNumber(
  ws: XLSX.WorkSheet,
  col: string,
  row: number,
): number | null {
  const v = getRawCellValue(ws, col, row);
  if (v === undefined) return null;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function getCellFloor(
  ws: XLSX.WorkSheet,
  col: string,
  row: number,
): string | number | undefined {
  const v = getRawCellValue(ws, col, row);
  if (v === undefined) return undefined;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : undefined;
  }
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

function formatRateDisplay(rates: Set<number>): string | undefined {
  if (rates.size === 0) return undefined;
  const sorted = [...rates].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return String(sorted[0]);
  }
  return `${sorted[0]}\u2013${sorted[sorted.length - 1]}`;
}

function resolveTargetSheet(
  workbook: XLSX.WorkBook,
  preferredName?: string,
): XLSX.WorkSheet {
  const target = preferredName ?? 'PriceList';
  if (workbook.Sheets[target]) {
    return workbook.Sheets[target];
  }
  const caseInsensitiveMatch = workbook.SheetNames.find(
    (name) => name.toLowerCase() === target.toLowerCase(),
  );
  if (caseInsensitiveMatch && workbook.Sheets[caseInsensitiveMatch]) {
    return workbook.Sheets[caseInsensitiveMatch];
  }
  const firstSheet = workbook.SheetNames[0];
  if (firstSheet && workbook.Sheets[firstSheet]) {
    return workbook.Sheets[firstSheet];
  }
  throw new Error('Workbook contains no sheets');
}

interface ProjectAccumulator {
  projectCode: string;
  unitCount: number;
  sinkingRates: Set<number>;
  commonFeeRates: Set<number>;
}

/**
 * Parses an Excel workbook buffer (`PriceList` sheet) into cleaned UnitRecords,
 * ProjectConfig summaries, and an ImportValidationReport.
 *
 * Automatically skips trailing blank rows after encountering `maxConsecutiveEmptyRows`
 * (default 50) empty Project+UnitCode rows, avoiding SheetJS iteration over 343k+ blank rows.
 */
export function parsePriceListWorkbook(
  buffer: ArrayBuffer | Uint8Array,
  options?: ImportOptions,
): ImportResult {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
  });

  const ws = resolveTargetSheet(workbook, options?.sheetName);
  const cols = normalizeColumnMapping(options?.columnMapping);
  const startRow = options?.startRow ?? 7;
  const maxEmpty = options?.maxConsecutiveEmptyRows ?? 50;
  const transferFeePct =
    options?.transferFeePct ?? DEFAULT_PROJECT_CONFIG_VALUES.transferFeePct;
  const projectFilter = options?.projectCode?.trim().toUpperCase();

  const customBlockedSet =
    options?.blockedDecorations !== undefined
      ? new Set(
          options.blockedDecorations
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        )
      : null;

  const isDecorationBlocked = (decoration: string | null): boolean => {
    if (!decoration) return false;
    if (customBlockedSet !== null) {
      return customBlockedSet.has(decoration);
    }
    return isDefaultBlockedDecoration(decoration);
  };

  const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
  const maxScanRow = range ? range.e.r + 1 : startRow + maxEmpty;

  const units: UnitRecord[] = [];
  const projectMap = new Map<string, ProjectAccumulator>();
  const seenCombineCodes = new Set<string>();
  const duplicateCodes: string[] = [];
  const decorationCounts = new Map<string, number>();

  let totalRowsScanned = 0;
  let consecutiveEmpty = 0;
  let duplicateCount = 0;
  let missingSgpCount = 0;
  let missingSgpCostCount = 0;
  let zeroSgpCount = 0;
  let missingScPriceCount = 0;
  let missingAgentPriceCount = 0;
  let missingExpenseColsCount = 0;
  let trimmedRoomTypeCount = 0;
  let blockedByDecorationCount = 0;
  let blockedByMissingCostCount = 0;
  let readyToSellCount = 0;

  for (let row = startRow; row <= maxScanRow; row++) {
    const rawProject = getTrimmedString(ws, cols.projectCode, row);
    const rawUnitCode = getTrimmedString(ws, cols.unitCode, row);

    if (!rawProject && !rawUnitCode) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= maxEmpty) {
        break;
      }
      continue;
    }
    consecutiveEmpty = 0;
    totalRowsScanned++;

    const projectCode = (rawProject ?? '').toUpperCase();
    const unitCode = rawUnitCode ?? '';

    if (projectFilter && projectCode !== projectFilter) {
      continue;
    }

    const decoration = getTrimmedString(ws, cols.decoration, row) ?? null;
    if (decoration) {
      decorationCounts.set(decoration, (decorationCounts.get(decoration) ?? 0) + 1);
    }

    const combineCode =
      getTrimmedString(ws, cols.combineCode, row) ?? `${projectCode}${unitCode}`;
    if (seenCombineCodes.has(combineCode)) {
      duplicateCount++;
      duplicateCodes.push(combineCode);
    } else {
      seenCombineCodes.add(combineCode);
    }

    const rawRoomCategory = getRawString(ws, cols.roomCategory, row);
    let roomCategory: string | undefined;
    if (rawRoomCategory !== undefined) {
      const trimmedRoom = rawRoomCategory.trim();
      if (trimmedRoom !== rawRoomCategory) {
        trimmedRoomTypeCount++;
      }
      roomCategory = trimmedRoom === '' ? undefined : trimmedRoom;
    }

    const areaSqm = getCellNumber(ws, cols.areaSqm, row) ?? undefined;
    const sgp = getCellNumber(ws, cols.sgp, row);
    const totalCostExpense = getCellNumber(ws, cols.totalCostExpense, row);
    const sgpCost = getCellNumber(ws, cols.sgpCost, row);
    const scPrice = getCellNumber(ws, cols.scPrice, row);
    const agentNetPrice = getCellNumber(ws, cols.agentNetPrice, row);

    if (sgp === null) missingSgpCount++;
    if (sgpCost === null) missingSgpCostCount++;
    if ((sgp !== null && sgp <= 0) || (sgpCost !== null && sgpCost <= 0)) {
      zeroSgpCount++;
    }
    if (scPrice === null) missingScPriceCount++;
    if (agentNetPrice === null) missingAgentPriceCount++;

    const rawTransferFee = getCellNumber(ws, cols.transferFee, row);
    const rawSinkingFund = getCellNumber(ws, cols.sinkingFund, row);
    const rawCommonFee1Y = getCellNumber(ws, cols.commonFee1Y, row);
    if (
      rawTransferFee === null ||
      rawSinkingFund === null ||
      rawCommonFee1Y === null
    ) {
      missingExpenseColsCount++;
    }

    const sinkingRatePerSqm = getCellNumber(ws, cols.sinkingRatePerSqm, row);
    const commonFeeRatePerSqmMonth = getCellNumber(
      ws,
      cols.commonFeeRatePerSqmMonth,
      row,
    );

    const effectiveU =
      sinkingRatePerSqm ?? options?.defaultSinkingRatePerSqm ?? 0;
    const effectiveW =
      commonFeeRatePerSqmMonth ?? options?.defaultCommonFeeRatePerSqmMonth ?? 0;
    const area = areaSqm ?? 0;

    // Always recompute T, V, X rather than relying on Excel sheet formulas/blanks
    const transferFee = (transferFeePct / 100) * (sgpCost ?? 0);
    const sinkingFund = effectiveU * area;
    const commonFee1Y = effectiveW * area * 12;

    let unitStatus = 'พร้อมขาย';
    let isBlocked = false;
    let blockReason: string | undefined;

    if (isDecorationBlocked(decoration)) {
      isBlocked = true;
      unitStatus = 'ห้ามขาย';
      blockReason = decoration ?? 'ห้ามขาย';
      blockedByDecorationCount++;
    } else if (sgpCost === null || sgpCost <= 0) {
      isBlocked = true;
      unitStatus = 'ยังไม่มีราคา';
      blockReason = 'ยังไม่มีราคาต้นทุน (SGP/O)';
      blockedByMissingCostCount++;
    } else {
      readyToSellCount++;
    }

    const unit: UnitRecord = {
      id: `${projectCode}:${unitCode}`,
      projectCode,
      unitCode,
      combineCode,
      unitStatus,
      decoration,
      building: getTrimmedString(ws, cols.building, row),
      floor: getCellFloor(ws, cols.floor, row),
      unitSuffix: getTrimmedString(ws, cols.unitSuffix, row),
      houseNumber: getTrimmedString(ws, cols.houseNumber, row),
      roomCategory,
      unitType: getTrimmedString(ws, cols.unitType, row),
      areaSqm,
      sgp,
      totalCostExpense,
      sgpCost,
      scPrice,
      agentNetPrice,
      sinkingRatePerSqm,
      commonFeeRatePerSqmMonth,
      commonFee1Y,
      sinkingFund,
      transferFee,
      isBlocked,
      ...(blockReason !== undefined ? { blockReason } : {}),
      ...(options?.priceVersion !== undefined
        ? { priceVersion: options.priceVersion }
        : {}),
      ...(options?.isActiveVersion !== undefined
        ? { isActiveVersion: options.isActiveVersion }
        : {}),
    };

    units.push(unit);

    let acc = projectMap.get(projectCode);
    if (!acc) {
      acc = {
        projectCode,
        unitCount: 0,
        sinkingRates: new Set<number>(),
        commonFeeRates: new Set<number>(),
      };
      projectMap.set(projectCode, acc);
    }
    acc.unitCount++;
    if (sinkingRatePerSqm !== null && sinkingRatePerSqm > 0) {
      acc.sinkingRates.add(sinkingRatePerSqm);
    }
    if (commonFeeRatePerSqmMonth !== null && commonFeeRatePerSqmMonth > 0) {
      acc.commonFeeRates.add(commonFeeRatePerSqmMonth);
    }
  }

  const projects: ProjectConfig[] = [...projectMap.values()].map((acc) => {
    const sortedU = [...acc.sinkingRates].sort((a, b) => a - b);
    const sortedW = [...acc.commonFeeRates].sort((a, b) => a - b);

    return {
      projectCode: acc.projectCode,
      projectName: options?.projectNameMap?.[acc.projectCode] ?? acc.projectCode,
      status: options?.projectStatusMap?.[acc.projectCode] ?? 'กำลังก่อสร้าง',
      sinkingRatePerSqm: sortedU[0],
      commonFeeRatePerSqmMonth: sortedW[0],
      sinkingRateDisplay: formatRateDisplay(acc.sinkingRates),
      commonFeeRateDisplay: formatRateDisplay(acc.commonFeeRates),
      transferFeePct,
      kFactor: DEFAULT_PROJECT_CONFIG_VALUES.kFactor,
      vatPct: DEFAULT_PROJECT_CONFIG_VALUES.vatPct,
      defaultVariance: DEFAULT_PROJECT_CONFIG_VALUES.defaultVariance,
      priceRoundStep: DEFAULT_PROJECT_CONFIG_VALUES.priceRoundStep,
      comStepPct: DEFAULT_PROJECT_CONFIG_VALUES.comStepPct,
      unitCount: acc.unitCount,
      ...(options?.priceVersion !== undefined
        ? { priceVersion: options.priceVersion }
        : {}),
    };
  });

  const decorations: DecorationSummaryItem[] = [...decorationCounts.entries()]
    .map(([text, count]) => ({
      text,
      count,
      defaultBlocked: isDefaultBlockedDecoration(text),
    }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

  const report: ImportValidationReport = {
    totalRowsScanned,
    importedUnitsCount: units.length,
    projectCount: projects.length,
    duplicateCount,
    duplicateCodes,
    missingSgpCount,
    missingSgpCostCount,
    zeroSgpCount,
    missingScPriceCount,
    missingAgentPriceCount,
    missingExpenseColsCount,
    trimmedRoomTypeCount,
    blockedByDecorationCount,
    blockedByMissingCostCount,
    readyToSellCount,
    decorations,
  };

  return {
    units,
    projects,
    report,
  };
}
