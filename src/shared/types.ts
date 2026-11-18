/**
 * Shared domain types for SC Price Negotiation PWA.
 */

export type ProjectStatus = 'กำลังก่อสร้าง' | 'Ready to move';

export const DEFAULT_PROJECT_CONFIG_VALUES = {
  transferFeePct: 1,
  kFactor: 1.046,
  vatPct: 7,
  defaultVariance: 50000,
  priceRoundStep: 10000,
  comStepPct: 1,
} as const;

export interface ProjectConfig {
  projectCode: string;
  projectName: string;
  status: ProjectStatus;
  sinkingRatePerSqm?: number;
  commonFeeRatePerSqmMonth?: number;
  /** Default: 1 (%) */
  transferFeePct: number;
  /** Default: 1.046 */
  kFactor: number;
  /** Default: 7 (%) */
  vatPct: number;
  /** Default: 50000 (THB) */
  defaultVariance: number;
  /** Default: 10000 (THB) */
  priceRoundStep: number;
  /** Default: 1 (%) */
  comStepPct: number;
  sinkingRateDisplay?: string;
  commonFeeRateDisplay?: string;
  specialRules?: string;
  unitCount?: number;
  priceVersion?: number;
  active?: boolean;
  updatedAt?: string;
}

/**
 * Full internal / Admin unit record containing sensitive cost columns (M, N, O).
 */
export interface UnitRecord {
  id: string;
  projectCode: string;
  unitCode: string;
  combineCode: string;
  unitStatus?: string;
  decoration?: string | null;
  building?: string;
  floor?: string | number;
  unitSuffix?: string;
  houseNumber?: string;
  roomCategory?: string;
  unitType?: string;
  areaSqm?: number;
  /** Column M: SGP (minimum selling price) */
  sgp: number | null;
  /** Column N: Total cost & promo expenses */
  totalCostExpense: number | null;
  /** Column O: SGP + promo cost baseline used in negotiation formulas */
  sgpCost: number | null;
  /** Column P: SC direct selling price */
  scPrice: number | null;
  /** Column R: Agent price (typically 10% commission list price) */
  agentNetPrice: number | null;
  /** Column U: Unit-specific sinking fund rate (THB/sqm) */
  sinkingRatePerSqm?: number | null;
  /** Column W: Unit-specific common fee rate (THB/sqm/month) */
  commonFeeRatePerSqmMonth?: number | null;
  /** 1-year common fee in THB */
  commonFee1Y: number;
  /** Sinking fund in THB */
  sinkingFund?: number;
  /** Transfer fee (1%) in THB */
  transferFee?: number;
  /** Special project rule guard (e.g. COLS SHOP1 or blocked decoration) */
  isBlocked?: boolean;
  blockReason?: string;
  priceVersion?: number;
  isActiveVersion?: boolean;
}

/**
 * Public / Sales-facing unit record stripped of sensitive cost columns M, N, O.
 */
export type SalesUnitRecord = Omit<UnitRecord, 'sgp' | 'totalCostExpense' | 'sgpCost'>;
export type PublicUnitRecord = SalesUnitRecord;

export type CalcMode = 'A' | 'B' | 'C';
export type DealStatus = 'pass' | 'approval' | 'fail';

export type ProjectCalcSettings = Pick<
  ProjectConfig,
  'kFactor' | 'vatPct' | 'defaultVariance' | 'priceRoundStep' | 'comStepPct'
>;

export interface CalcUnitParams {
  projectCode?: string;
  unitCode?: string;
  sgpCost: number | null | undefined;
  commonFee1Y: number;
  agentNetPrice?: number | null;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface CalcInput {
  mode: CalcMode;
  unit: CalcUnitParams;
  project?: Partial<ProjectCalcSettings>;
  /** Mode A & Mode C: Agent commission percentage (e.g. 2 for 2%) */
  commissionPct?: number;
  /** Mode B & Mode C: Proposed selling price in THB */
  sellingPrice?: number;
  /** Additional years of free common fee requested by customer (default 0) */
  freeCommonYears?: number;
  /** Extra promotion cost in THB (default 0) */
  extraPromo?: number;
  /** Variance / negotiation buffer in THB (default project.defaultVariance or 50000) */
  variance?: number;
}

export interface CalcBreakdown {
  sellingPrice: number;
  commissionPct: number;
  effectiveComRatePct: number;
  commissionAmount: number;
  sgpPlusCost: number;
  freeCommonYears: number;
  freeCommonAmount: number;
  extraPromoAmount: number;
  remainingVariance: number;
}

export type CalcGuardErrorCode =
  | 'UNIT_BLOCKED'
  | 'MISSING_SGP_COST'
  | 'INVALID_INPUT'
  | 'COMMISSION_RATE_TOO_HIGH';

export interface CalcErrorResult {
  ok: false;
  errorCode: CalcGuardErrorCode;
  errorMessage: string;
}

export interface CalcSuccessResult {
  ok: true;
  mode: CalcMode;
  status: DealStatus;
  statusLabel: string;
  sellingPrice: number;
  effectiveCommissionPct: number;
  remainingVariance: number;
  remainingExact: number;
  varianceThreshold: number;
  minRequiredAmount: number;
  breakdown: CalcBreakdown;
  /** Mode A: difference from Agent list price (agentNetPrice - sellingPrice) */
  diffFromAgentPrice?: number;
  /** Mode A: percentage difference from Agent list price */
  diffFromAgentPct?: number;
  /** Mode B: maximum commission cost ceiling (%) before step rounding */
  ceilingPct?: number;
  /** Mode B: raw agent commission (%) before flooring to comStepPct */
  rawAgentComPct?: number;
  /** Mode B: whether at least 0% / positive commission headroom exists */
  canGiveCommission?: boolean;
  /** Mode B: next commission step (%) above effectiveCommissionPct */
  nextStepComPct?: number;
  /** Mode B: actual cost (%) of nextStepComPct including VAT and K */
  nextStepActualCostPct?: number;
  /** Mode B: excess (%) of nextStepActualCostPct over ceilingPct */
  nextStepExcessPct?: number;
}

export type CalcResult = CalcSuccessResult | CalcErrorResult;

export interface DealLogRecord {
  id: string;
  createdAt: string;
  projectCode: string;
  unitCode: string;
  mode: CalcMode;
  sellingPrice: number;
  commissionPct: number;
  freeCommonYears: number;
  extraPromo: number;
  varianceThreshold: number;
  remainingVariance: number;
  status: DealStatus;
  salesEmail: string;
  salesName: string;
  actionType: 'save' | 'request_approval';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  note?: string;
}

export type UserRole = 'admin' | 'sales' | 'approver';

export interface UserRecord {
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface ColumnMapping {
  decoration: string;
  houseNumber: string;
  projectCode: string;
  unitCode: string;
  combineCode: string;
  building: string;
  floor: string;
  unitSuffix: string;
  unitType: string;
  roomCategory: string;
  areaSqm: string;
  sgp: string;
  totalCostExpense: string;
  sgpCost: string;
  scPrice: string;
  agentNetPrice: string;
  transferFee: string;
  sinkingRatePerSqm: string;
  sinkingFund: string;
  commonFeeRatePerSqmMonth: string;
  commonFee1Y: string;
}

export interface DecorationSummaryItem {
  text: string;
  count: number;
  defaultBlocked: boolean;
}

export interface ImportValidationReport {
  totalRowsScanned: number;
  importedUnitsCount: number;
  projectCount: number;
  duplicateCount: number;
  duplicateCodes: string[];
  missingSgpCount: number;
  missingSgpCostCount: number;
  zeroSgpCount: number;
  missingScPriceCount: number;
  missingAgentPriceCount: number;
  missingExpenseColsCount: number;
  trimmedRoomTypeCount: number;
  blockedByDecorationCount: number;
  blockedByMissingCostCount: number;
  readyToSellCount: number;
  decorations: DecorationSummaryItem[];
}

export interface ImportOptions {
  projectCode?: string;
  sheetName?: string;
  startRow?: number;
  maxConsecutiveEmptyRows?: number;
  columnMapping?: Partial<ColumnMapping>;
  transferFeePct?: number;
  defaultSinkingRatePerSqm?: number;
  defaultCommonFeeRatePerSqmMonth?: number;
  blockedDecorations?: string[];
  priceVersion?: number;
  isActiveVersion?: boolean;
  projectStatusMap?: Record<string, ProjectStatus>;
  projectNameMap?: Record<string, string>;
}

export interface ImportResult {
  units: UnitRecord[];
  projects: ProjectConfig[];
  report: ImportValidationReport;
}

export interface PriceVersionSummary {
  version: number;
  publishedAt: string;
  publishedBy: string;
  unitCount: number;
}

export type ApiAction =
  | 'auth.me'
  | 'catalog.bootstrap'
  | 'units.search'
  | 'units.get'
  | 'calc.compute'
  | 'deals.list'
  | 'deals.create'
  | 'deals.requestApproval'
  | 'deals.review'
  | 'admin.upsertProject'
  | 'admin.publishUnits'
  | 'admin.getProjectVersions'
  | 'admin.users.list'
  | 'admin.users.upsert'
  | 'admin.users.delete';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CALC_ERROR'
  | 'CANNOT_REMOVE_LAST_ADMIN'
  | 'INTERNAL_ERROR';

export interface ApiRequest<TPayload = unknown> {
  action: ApiAction;
  payload?: TPayload;
  /** Production Google Sign-In ID token */
  idToken?: string;
  /** Local dev sandbox / test email identity (role is always resolved server-side) */
  devEmail?: string;
}

export interface ApiSuccessResponse<TData = unknown> {
  ok: true;
  action: ApiAction;
  data: TData;
}

export interface ApiErrorResponse {
  ok: false;
  action?: ApiAction;
  errorCode: ApiErrorCode;
  errorMessage: string;
}

export type ApiResponse<TData = unknown> =
  | ApiSuccessResponse<TData>
  | ApiErrorResponse;

export interface AuthMeData {
  user: UserRecord;
}

export interface CatalogBootstrapPayload {
  includeInactive?: boolean;
}

export interface CatalogBootstrapData {
  user: UserRecord;
  projects: ProjectConfig[];
  recentUnits: Array<UnitRecord | SalesUnitRecord>;
  totalUnitCount: number;
}

export interface UnitsSearchPayload {
  projectCode?: string;
  query?: string;
  limit?: number;
  includeBlocked?: boolean;
}

export interface UnitsSearchData {
  units: Array<UnitRecord | SalesUnitRecord>;
  total: number;
}

export interface UnitsGetPayload {
  projectCode: string;
  unitCode: string;
}

export interface UnitsGetData {
  unit: UnitRecord | SalesUnitRecord;
  project: ProjectConfig;
}

export interface CalcComputePayload {
  projectCode: string;
  unitCode: string;
  mode: CalcMode;
  commissionPct?: number;
  sellingPrice?: number;
  freeCommonYears?: number;
  extraPromo?: number;
  variance?: number;
}

export interface CalcComputeData {
  result: CalcResult;
  unit: UnitRecord | SalesUnitRecord;
  project: ProjectConfig;
}

export type DealsListFilter = 'all' | 'pending' | 'mine';

export interface DealsListPayload {
  filter?: DealsListFilter;
  projectCode?: string;
}

export interface DealsListData {
  deals: DealLogRecord[];
}

export interface DealsCreatePayload {
  projectCode: string;
  unitCode: string;
  mode: CalcMode;
  commissionPct?: number;
  sellingPrice?: number;
  freeCommonYears?: number;
  extraPromo?: number;
  variance?: number;
  actionType: 'save' | 'request_approval';
  note?: string;
}

export interface DealsCreateData {
  deal: DealLogRecord;
}

export interface DealsRequestApprovalPayload {
  dealId: string;
  note?: string;
}

export interface DealsRequestApprovalData {
  deal: DealLogRecord;
}

export interface DealsReviewPayload {
  dealId: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export interface DealsReviewData {
  deal: DealLogRecord;
}

export interface AdminUpsertProjectPayload {
  project: Partial<ProjectConfig> & { projectCode: string };
}

export interface AdminUpsertProjectData {
  project: ProjectConfig;
  readyToMoveWarning: boolean;
  warningMessage?: string;
}

export interface AdminPublishUnitsPayload {
  units: UnitRecord[];
  projects?: ProjectConfig[];
  targetProjectCode?: string;
}

export interface AdminPublishUnitsData {
  projects: ProjectConfig[];
  publishedCount: number;
  versions: Record<string, number>;
}

export interface AdminGetProjectVersionsPayload {
  projectCode: string;
  version?: number;
}

export interface AdminGetProjectVersionsData {
  projectCode: string;
  versions: PriceVersionSummary[];
  selectedVersion: number;
  units: UnitRecord[];
}

export interface AdminUsersListData {
  users: UserRecord[];
}

export interface AdminUsersUpsertPayload {
  user: UserRecord;
}

export interface AdminUsersUpsertData {
  user: UserRecord;
}

export interface AdminUsersDeletePayload {
  email: string;
}

export interface AdminUsersDeleteData {
  deletedEmail: string;
}
