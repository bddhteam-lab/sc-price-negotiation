import { calculateDeal } from '../shared/calcEngine';
import {
  AdminGetProjectVersionsData,
  AdminGetProjectVersionsPayload,
  AdminPublishUnitsData,
  AdminPublishUnitsPayload,
  AdminUpsertProjectData,
  AdminUpsertProjectPayload,
  AdminUsersDeleteData,
  AdminUsersDeletePayload,
  AdminUsersListData,
  AdminUsersUpsertData,
  AdminUsersUpsertPayload,
  ApiAction,
  ApiErrorCode,
  ApiErrorResponse,
  ApiRequest,
  ApiResponse,
  AuthMeData,
  CalcComputeData,
  CalcComputePayload,
  CatalogBootstrapData,
  CatalogBootstrapPayload,
  DEFAULT_PROJECT_CONFIG_VALUES,
  DealLogRecord,
  DealsCreateData,
  DealsCreatePayload,
  DealsListData,
  DealsListPayload,
  DealsRequestApprovalData,
  DealsRequestApprovalPayload,
  DealsReviewData,
  DealsReviewPayload,
  PriceVersionSummary,
  ProjectConfig,
  SalesUnitRecord,
  UnitRecord,
  UnitsGetData,
  UnitsGetPayload,
  UnitsSearchData,
  UnitsSearchPayload,
  UserRecord,
  UserRole,
} from '../shared/types';

export const READY_TO_MOVE_WARNING_MESSAGE =
  'เมื่อเปลี่ยนสถานะเป็น Ready to move ต้องอัปเดตต้นทุนในช่อง O ให้รวมฟรีส่วนกลางปีแรกด้วย';

/**
 * Strips sensitive cost columns M (sgp), N (totalCostExpense), and O (sgpCost)
 * from a UnitRecord before returning it to non-admin (sales) callers.
 */
export function toSalesUnitRecord(unit: UnitRecord): SalesUnitRecord {
  const sanitized: Record<string, unknown> = { ...unit };
  delete sanitized.sgp;
  delete sanitized.totalCostExpense;
  delete sanitized.sgpCost;

  if (
    'sgp' in sanitized ||
    'totalCostExpense' in sanitized ||
    'sgpCost' in sanitized
  ) {
    throw new Error('Security invariant violated: sensitive unit keys still present');
  }

  return sanitized as unknown as SalesUnitRecord;
}

export function sanitizeUnitForRole(
  unit: UnitRecord,
  role: UserRole,
): UnitRecord | SalesUnitRecord {
  if (role === 'admin') {
    return { ...unit };
  }
  return toSalesUnitRecord(unit);
}

function formatRateDisplay(rates: Set<number>): string | undefined {
  if (rates.size === 0) return undefined;
  const sorted = [...rates].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  return `${sorted[0]}\u2013${sorted[sorted.length - 1]}`;
}

function unitMatchesSpecialBlockRule(
  unit: UnitRecord,
  specialRules?: string,
): boolean {
  if (!specialRules || !specialRules.trim()) {
    return false;
  }
  const normalizedRules = specialRules.toLowerCase();
  if (!normalizedRules.includes('ห้าม') && !normalizedRules.includes('block')) {
    return false;
  }
  const escapedCode = unit.unitCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenRegex = new RegExp(`(^|[^a-z0-9])${escapedCode.toLowerCase()}([^a-z0-9]|$)`, 'i');
  return tokenRegex.test(specialRules);
}

export interface ApiServiceSeedData {
  projects: ProjectConfig[];
  units: UnitRecord[];
  users: UserRecord[];
  deals?: DealLogRecord[];
  versionHistory?: Record<string, PriceVersionSummary[]>;
  allowDevAuth?: boolean;
  tokenVerifier?: (idToken: string) => Promise<string | null> | string | null;
}

function makeError(
  errorCode: ApiErrorCode,
  errorMessage: string,
  action?: ApiAction,
): ApiErrorResponse {
  return {
    ok: false,
    ...(action !== undefined ? { action } : {}),
    errorCode,
    errorMessage,
  };
}

/**
 * Stateful 4-sheet backend service (`Projects`, `Units`, `Users`, `Log`)
 * enforcing strict role security and exact calculation parity.
 */
export class ApiService {
  private projects = new Map<string, ProjectConfig>();
  private units: UnitRecord[] = [];
  private users = new Map<string, UserRecord>();
  private deals: DealLogRecord[] = [];
  private versionHistory = new Map<string, PriceVersionSummary[]>();
  private allowDevAuth: boolean;
  private tokenVerifier?: (
    idToken: string,
  ) => Promise<string | null> | string | null;
  private dealCounter = 100;

  constructor(seed: ApiServiceSeedData) {
    this.allowDevAuth = seed.allowDevAuth ?? true;
    this.tokenVerifier = seed.tokenVerifier;

    const now = new Date().toISOString();

    for (const proj of seed.projects) {
      const code = proj.projectCode.trim().toUpperCase();
      this.projects.set(code, {
        ...proj,
        projectCode: code,
        active: proj.active ?? true,
        priceVersion: proj.priceVersion ?? 1,
      });
    }

    this.units = seed.units.map((u) => ({
      ...u,
      projectCode: u.projectCode.trim().toUpperCase(),
      priceVersion: u.priceVersion ?? 1,
      isActiveVersion: u.isActiveVersion ?? true,
    }));

    for (const user of seed.users) {
      const email = user.email.trim().toLowerCase();
      this.users.set(email, { ...user, email });
    }

    this.deals = (seed.deals ?? []).map((d) => ({ ...d }));

    if (seed.versionHistory) {
      for (const [code, summaries] of Object.entries(seed.versionHistory)) {
        this.versionHistory.set(
          code.toUpperCase(),
          summaries.map((s) => ({ ...s })),
        );
      }
    } else {
      for (const proj of this.projects.values()) {
        const version = proj.priceVersion ?? 1;
        const unitCount = this.units.filter(
          (u) => u.projectCode === proj.projectCode && (u.priceVersion ?? 1) === version,
        ).length;
        this.versionHistory.set(proj.projectCode, [
          {
            version,
            publishedAt: proj.updatedAt ?? now,
            publishedBy: 'bddhteam@gmail.com',
            unitCount,
          },
        ]);
      }
    }
  }

  private async resolveCaller(
    req: ApiRequest,
    fallbackEmail?: string,
  ): Promise<UserRecord | null> {
    let email: string | null = null;

    if (req.idToken) {
      if (this.tokenVerifier) {
        email = await this.tokenVerifier(req.idToken);
      } else if (this.allowDevAuth && req.idToken.startsWith('dev:')) {
        email = req.idToken.slice(4);
      }
    }

    if (!email && this.allowDevAuth) {
      email = req.devEmail ?? fallbackEmail ?? null;
    }

    if (!email) {
      return null;
    }

    const user = this.users.get(email.trim().toLowerCase());
    if (!user || !user.active) {
      return null;
    }

    return { ...user };
  }

  private findActiveUnit(
    projectCode: string,
    unitCode: string,
  ): UnitRecord | undefined {
    const pCode = projectCode.trim().toUpperCase();
    const uCode = unitCode.trim().toUpperCase();
    return this.units.find(
      (u) =>
        u.isActiveVersion !== false &&
        u.projectCode === pCode &&
        u.unitCode.trim().toUpperCase() === uCode,
    );
  }

  private countOtherActiveAdmins(excludeEmail: string): number {
    let count = 0;
    const target = excludeEmail.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email !== target && u.role === 'admin' && u.active) {
        count++;
      }
    }
    return count;
  }

  async handleRequest(
    req: ApiRequest,
    options?: { fallbackEmail?: string },
  ): Promise<ApiResponse> {
    if (!req || !req.action) {
      return makeError('BAD_REQUEST', 'Missing API action');
    }

    const caller = await this.resolveCaller(req, options?.fallbackEmail);
    if (!caller) {
      return makeError(
        'UNAUTHORIZED',
        'กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์',
        req.action,
      );
    }

    switch (req.action) {
      case 'auth.me': {
        const data: AuthMeData = { user: caller };
        return { ok: true, action: req.action, data };
      }

      case 'catalog.bootstrap': {
        const payload = (req.payload ?? {}) as CatalogBootstrapPayload;
        const includeInactive =
          caller.role === 'admin' && Boolean(payload.includeInactive);

        const visibleProjects = [...this.projects.values()]
          .filter((p) => includeInactive || p.active !== false)
          .map((p) => ({ ...p }));
        const visibleProjectCodes = new Set(
          visibleProjects.map((p) => p.projectCode),
        );

        const activeUnits = this.units.filter(
          (u) =>
            u.isActiveVersion !== false &&
            visibleProjectCodes.has(u.projectCode),
        );

        const recentCandidates: UnitRecord[] = [];
        const seenIds = new Set<string>();
        for (const deal of this.deals) {
          const u = this.findActiveUnit(deal.projectCode, deal.unitCode);
          if (u && visibleProjectCodes.has(u.projectCode) && !seenIds.has(u.id)) {
            seenIds.add(u.id);
            recentCandidates.push(u);
          }
          if (recentCandidates.length >= 2) break;
        }
        if (recentCandidates.length < 2) {
          for (const u of activeUnits) {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id);
              recentCandidates.push(u);
            }
            if (recentCandidates.length >= 2) break;
          }
        }

        const data: CatalogBootstrapData = {
          user: caller,
          projects: visibleProjects,
          recentUnits: recentCandidates.map((u) =>
            sanitizeUnitForRole(u, caller.role),
          ),
          totalUnitCount: activeUnits.length,
        };
        return { ok: true, action: req.action, data };
      }

      case 'units.search': {
        const payload = (req.payload ?? {}) as UnitsSearchPayload;
        const projectFilter = payload.projectCode?.trim().toUpperCase();
        const q = payload.query?.trim().toLowerCase() ?? '';
        const includeBlocked = payload.includeBlocked ?? true;
        const limit = Math.min(Math.max(payload.limit ?? 50, 1), 500);

        const activeProjectCodes = new Set(
          [...this.projects.values()]
            .filter((p) => p.active !== false)
            .map((p) => p.projectCode),
        );

        const matched = this.units.filter((u) => {
          if (u.isActiveVersion === false) return false;
          if (!activeProjectCodes.has(u.projectCode)) return false;
          if (projectFilter && u.projectCode !== projectFilter) return false;
          if (!includeBlocked && u.isBlocked) return false;
          if (!q) return true;
          return (
            u.unitCode.toLowerCase().includes(q) ||
            u.combineCode.toLowerCase().includes(q) ||
            u.projectCode.toLowerCase().includes(q) ||
            (u.houseNumber?.toLowerCase().includes(q) ?? false) ||
            (u.roomCategory?.toLowerCase().includes(q) ?? false) ||
            (u.unitType?.toLowerCase().includes(q) ?? false) ||
            (u.building?.toLowerCase().includes(q) ?? false)
          );
        });

        if (q) {
          matched.sort((a, b) => {
            const aExact = a.unitCode.toLowerCase() === q ? 0 : 1;
            const bExact = b.unitCode.toLowerCase() === q ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            const aPrefix = a.unitCode.toLowerCase().startsWith(q) ? 0 : 1;
            const bPrefix = b.unitCode.toLowerCase().startsWith(q) ? 0 : 1;
            return aPrefix - bPrefix;
          });
        }

        const sliced = matched
          .slice(0, limit)
          .map((u) => sanitizeUnitForRole(u, caller.role));

        const data: UnitsSearchData = {
          units: sliced,
          total: matched.length,
        };
        return { ok: true, action: req.action, data };
      }

      case 'units.get': {
        const payload = (req.payload ?? {}) as Partial<UnitsGetPayload>;
        if (!payload.projectCode || !payload.unitCode) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุ projectCode และ unitCode',
            req.action,
          );
        }

        const pCode = payload.projectCode.trim().toUpperCase();
        const project = this.projects.get(pCode);
        const unit = this.findActiveUnit(pCode, payload.unitCode);

        if (!project || !unit) {
          return makeError(
            'NOT_FOUND',
            `ไม่พบข้อมูลห้อง ${payload.projectCode} ${payload.unitCode}`,
            req.action,
          );
        }

        const data: UnitsGetData = {
          unit: sanitizeUnitForRole(unit, caller.role),
          project: { ...project },
        };
        return { ok: true, action: req.action, data };
      }

      case 'calc.compute': {
        const payload = (req.payload ?? {}) as Partial<CalcComputePayload>;
        if (!payload.projectCode || !payload.unitCode || !payload.mode) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุ projectCode, unitCode และ mode',
            req.action,
          );
        }

        const pCode = payload.projectCode.trim().toUpperCase();
        const project = this.projects.get(pCode);
        const unit = this.findActiveUnit(pCode, payload.unitCode);

        if (!project || !unit) {
          return makeError(
            'NOT_FOUND',
            `ไม่พบข้อมูลห้อง ${payload.projectCode} ${payload.unitCode}`,
            req.action,
          );
        }

        const blockedByProjectRule = unitMatchesSpecialBlockRule(
          unit,
          project.specialRules,
        );
        const effectiveUnit: UnitRecord = blockedByProjectRule
          ? {
              ...unit,
              isBlocked: true,
              blockReason: project.specialRules,
            }
          : unit;

        const result = calculateDeal({
          mode: payload.mode,
          unit: effectiveUnit,
          project,
          commissionPct: payload.commissionPct,
          sellingPrice: payload.sellingPrice,
          freeCommonYears: payload.freeCommonYears,
          extraPromo: payload.extraPromo,
          variance: payload.variance,
        });

        const data: CalcComputeData = {
          result,
          unit: sanitizeUnitForRole(effectiveUnit, caller.role),
          project: { ...project },
        };
        return { ok: true, action: req.action, data };
      }

      case 'deals.list': {
        const payload = (req.payload ?? {}) as DealsListPayload;
        const filter = payload.filter ?? 'all';
        const pFilter = payload.projectCode?.trim().toUpperCase();

        const filtered = this.deals
          .filter((d) => {
            if (pFilter && d.projectCode !== pFilter) return false;
            if (filter === 'pending') {
              return d.approvalStatus === 'pending';
            }
            if (filter === 'mine') {
              return d.salesEmail.toLowerCase() === caller.email.toLowerCase();
            }
            return true;
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .map((d) => ({ ...d }));

        const data: DealsListData = { deals: filtered };
        return { ok: true, action: req.action, data };
      }

      case 'deals.create': {
        const payload = (req.payload ?? {}) as Partial<DealsCreatePayload>;
        if (!payload.projectCode || !payload.unitCode || !payload.mode) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุข้อมูลดีลให้ครบถ้วน',
            req.action,
          );
        }

        const pCode = payload.projectCode.trim().toUpperCase();
        const project = this.projects.get(pCode);
        const unit = this.findActiveUnit(pCode, payload.unitCode);
        if (!project || !unit) {
          return makeError(
            'NOT_FOUND',
            `ไม่พบข้อมูลห้อง ${payload.projectCode} ${payload.unitCode}`,
            req.action,
          );
        }

        const blockedByProjectRule = unitMatchesSpecialBlockRule(
          unit,
          project.specialRules,
        );
        const effectiveUnit = blockedByProjectRule
          ? { ...unit, isBlocked: true, blockReason: project.specialRules }
          : unit;

        const calcResult = calculateDeal({
          mode: payload.mode,
          unit: effectiveUnit,
          project,
          commissionPct: payload.commissionPct,
          sellingPrice: payload.sellingPrice,
          freeCommonYears: payload.freeCommonYears,
          extraPromo: payload.extraPromo,
          variance: payload.variance,
        });

        if (!calcResult.ok) {
          return makeError('CALC_ERROR', calcResult.errorMessage, req.action);
        }

        this.dealCounter += 1;
        const actionType = payload.actionType ?? 'save';
        const deal: DealLogRecord = {
          id: `deal_${Date.now()}_${this.dealCounter}`,
          createdAt: new Date().toISOString(),
          projectCode: unit.projectCode,
          unitCode: unit.unitCode,
          mode: payload.mode,
          sellingPrice: calcResult.sellingPrice,
          commissionPct: calcResult.effectiveCommissionPct,
          freeCommonYears: payload.freeCommonYears ?? 0,
          extraPromo: payload.extraPromo ?? 0,
          varianceThreshold: calcResult.varianceThreshold,
          remainingVariance: calcResult.remainingVariance,
          status: calcResult.status,
          salesEmail: caller.email,
          salesName: caller.name,
          actionType,
          ...(actionType === 'request_approval'
            ? { approvalStatus: 'pending' as const }
            : {}),
          ...(payload.note ? { note: payload.note } : {}),
        };

        this.deals.unshift(deal);
        const data: DealsCreateData = { deal: { ...deal } };
        return { ok: true, action: req.action, data };
      }

      case 'deals.requestApproval': {
        const payload = (req.payload ??
          {}) as Partial<DealsRequestApprovalPayload>;
        if (!payload.dealId) {
          return makeError('BAD_REQUEST', 'กรุณาระบุ dealId', req.action);
        }

        const deal = this.deals.find((d) => d.id === payload.dealId);
        if (!deal) {
          return makeError('NOT_FOUND', 'ไม่พบรายการดีลที่ระบุ', req.action);
        }

        if (
          caller.role === 'sales' &&
          deal.salesEmail.toLowerCase() !== caller.email.toLowerCase()
        ) {
          return makeError(
            'FORBIDDEN',
            'ไม่สามารถส่งขออนุมัติดีลของผู้อื่นได้',
            req.action,
          );
        }

        deal.actionType = 'request_approval';
        deal.approvalStatus = 'pending';
        if (payload.note !== undefined) {
          deal.note = payload.note;
        }

        const data: DealsRequestApprovalData = { deal: { ...deal } };
        return { ok: true, action: req.action, data };
      }

      case 'deals.review': {
        if (caller.role !== 'admin' && caller.role !== 'approver') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin หรือ Approver เท่านั้นที่อนุมัติดีลได้',
            req.action,
          );
        }

        const payload = (req.payload ?? {}) as Partial<DealsReviewPayload>;
        if (
          !payload.dealId ||
          (payload.decision !== 'approved' && payload.decision !== 'rejected')
        ) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุ dealId และ decision (approved / rejected)',
            req.action,
          );
        }

        const deal = this.deals.find((d) => d.id === payload.dealId);
        if (!deal) {
          return makeError('NOT_FOUND', 'ไม่พบรายการดีลที่ระบุ', req.action);
        }

        deal.approvalStatus = payload.decision;
        deal.approvedBy = caller.email;
        deal.approvedAt = new Date().toISOString();
        if (payload.note !== undefined) {
          deal.note = payload.note;
        }

        const data: DealsReviewData = { deal: { ...deal } };
        return { ok: true, action: req.action, data };
      }

      case 'admin.upsertProject': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่จัดการโครงการได้',
            req.action,
          );
        }

        const payload = (req.payload ?? {}) as Partial<AdminUpsertProjectPayload>;
        const rawCode = payload.project?.projectCode?.trim().toUpperCase();
        if (!rawCode) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุรหัสโครงการ (projectCode)',
            req.action,
          );
        }

        const prev = this.projects.get(rawCode);
        const now = new Date().toISOString();

        const nextStatus =
          payload.project?.status ?? prev?.status ?? 'กำลังก่อสร้าง';
        const isTransitioningToReady =
          nextStatus === 'Ready to move' &&
          (!prev || prev.status !== 'Ready to move');

        const saved: ProjectConfig = {
          projectCode: rawCode,
          projectName:
            payload.project?.projectName ?? prev?.projectName ?? rawCode,
          status: nextStatus,
          sinkingRatePerSqm:
            payload.project?.sinkingRatePerSqm ?? prev?.sinkingRatePerSqm,
          commonFeeRatePerSqmMonth:
            payload.project?.commonFeeRatePerSqmMonth ??
            prev?.commonFeeRatePerSqmMonth,
          transferFeePct:
            payload.project?.transferFeePct ??
            prev?.transferFeePct ??
            DEFAULT_PROJECT_CONFIG_VALUES.transferFeePct,
          kFactor:
            payload.project?.kFactor ??
            prev?.kFactor ??
            DEFAULT_PROJECT_CONFIG_VALUES.kFactor,
          vatPct:
            payload.project?.vatPct ??
            prev?.vatPct ??
            DEFAULT_PROJECT_CONFIG_VALUES.vatPct,
          defaultVariance:
            payload.project?.defaultVariance ??
            prev?.defaultVariance ??
            DEFAULT_PROJECT_CONFIG_VALUES.defaultVariance,
          priceRoundStep:
            payload.project?.priceRoundStep ??
            prev?.priceRoundStep ??
            DEFAULT_PROJECT_CONFIG_VALUES.priceRoundStep,
          comStepPct:
            payload.project?.comStepPct ??
            prev?.comStepPct ??
            DEFAULT_PROJECT_CONFIG_VALUES.comStepPct,
          sinkingRateDisplay:
            payload.project?.sinkingRateDisplay ?? prev?.sinkingRateDisplay,
          commonFeeRateDisplay:
            payload.project?.commonFeeRateDisplay ?? prev?.commonFeeRateDisplay,
          specialRules:
            payload.project?.specialRules !== undefined
              ? payload.project.specialRules
              : prev?.specialRules,
          unitCount: payload.project?.unitCount ?? prev?.unitCount ?? 0,
          priceVersion:
            payload.project?.priceVersion ?? prev?.priceVersion ?? 0,
          active: payload.project?.active ?? prev?.active ?? true,
          updatedAt: now,
        };

        this.projects.set(rawCode, saved);

        const data: AdminUpsertProjectData = {
          project: { ...saved },
          readyToMoveWarning: isTransitioningToReady,
          ...(isTransitioningToReady
            ? { warningMessage: READY_TO_MOVE_WARNING_MESSAGE }
            : {}),
        };
        return { ok: true, action: req.action, data };
      }

      case 'admin.publishUnits': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่เผยแพร่ใบราคาได้',
            req.action,
          );
        }

        const payload = (req.payload ?? {}) as Partial<AdminPublishUnitsPayload>;
        if (!payload.units || payload.units.length === 0) {
          return makeError(
            'BAD_REQUEST',
            'ไม่มีรายการห้องสำหรับเผยแพร่',
            req.action,
          );
        }

        const now = new Date().toISOString();
        const incomingProjectMeta = new Map<string, ProjectConfig>();
        for (const p of payload.projects ?? []) {
          incomingProjectMeta.set(p.projectCode.trim().toUpperCase(), p);
        }

        const grouped = new Map<string, UnitRecord[]>();
        for (const u of payload.units) {
          const pCode = (
            payload.targetProjectCode ?? u.projectCode
          ).trim().toUpperCase();
          const list = grouped.get(pCode) ?? [];
          list.push(u);
          grouped.set(pCode, list);
        }

        const updatedProjects: ProjectConfig[] = [];
        const versions: Record<string, number> = {};

        for (const [pCode, rawProjectUnits] of grouped.entries()) {
          const prevProject = this.projects.get(pCode);
          const nextVersion = (prevProject?.priceVersion ?? 0) + 1;

          // Deactivate prior versions for this project
          for (const existing of this.units) {
            if (
              existing.projectCode === pCode &&
              existing.isActiveVersion !== false
            ) {
              existing.isActiveVersion = false;
            }
          }

          const sinkingRates = new Set<number>();
          const commonFeeRates = new Set<number>();

          const versionedUnits: UnitRecord[] = rawProjectUnits.map((u) => {
            if (u.sinkingRatePerSqm && u.sinkingRatePerSqm > 0) {
              sinkingRates.add(u.sinkingRatePerSqm);
            }
            if (u.commonFeeRatePerSqmMonth && u.commonFeeRatePerSqmMonth > 0) {
              commonFeeRates.add(u.commonFeeRatePerSqmMonth);
            }
            const unitCode = u.unitCode.trim();
            return {
              ...u,
              id: `${pCode}:${unitCode}`,
              projectCode: pCode,
              unitCode,
              combineCode: u.combineCode || `${pCode}${unitCode}`,
              priceVersion: nextVersion,
              isActiveVersion: true,
            };
          });

          this.units.push(...versionedUnits);

          const meta = incomingProjectMeta.get(pCode);
          const sortedU = [...sinkingRates].sort((a, b) => a - b);
          const sortedW = [...commonFeeRates].sort((a, b) => a - b);

          const updatedProject: ProjectConfig = {
            projectCode: pCode,
            projectName:
              prevProject?.projectName ?? meta?.projectName ?? pCode,
            status: prevProject?.status ?? meta?.status ?? 'กำลังก่อสร้าง',
            sinkingRatePerSqm:
              sortedU[0] ??
              meta?.sinkingRatePerSqm ??
              prevProject?.sinkingRatePerSqm,
            commonFeeRatePerSqmMonth:
              sortedW[0] ??
              meta?.commonFeeRatePerSqmMonth ??
              prevProject?.commonFeeRatePerSqmMonth,
            sinkingRateDisplay:
              formatRateDisplay(sinkingRates) ??
              meta?.sinkingRateDisplay ??
              prevProject?.sinkingRateDisplay,
            commonFeeRateDisplay:
              formatRateDisplay(commonFeeRates) ??
              meta?.commonFeeRateDisplay ??
              prevProject?.commonFeeRateDisplay,
            transferFeePct:
              prevProject?.transferFeePct ??
              meta?.transferFeePct ??
              DEFAULT_PROJECT_CONFIG_VALUES.transferFeePct,
            kFactor:
              prevProject?.kFactor ??
              meta?.kFactor ??
              DEFAULT_PROJECT_CONFIG_VALUES.kFactor,
            vatPct:
              prevProject?.vatPct ??
              meta?.vatPct ??
              DEFAULT_PROJECT_CONFIG_VALUES.vatPct,
            defaultVariance:
              prevProject?.defaultVariance ??
              meta?.defaultVariance ??
              DEFAULT_PROJECT_CONFIG_VALUES.defaultVariance,
            priceRoundStep:
              prevProject?.priceRoundStep ??
              meta?.priceRoundStep ??
              DEFAULT_PROJECT_CONFIG_VALUES.priceRoundStep,
            comStepPct:
              prevProject?.comStepPct ??
              meta?.comStepPct ??
              DEFAULT_PROJECT_CONFIG_VALUES.comStepPct,
            specialRules: prevProject?.specialRules,
            unitCount: versionedUnits.length,
            priceVersion: nextVersion,
            active: prevProject?.active ?? true,
            updatedAt: now,
          };

          this.projects.set(pCode, updatedProject);
          updatedProjects.push({ ...updatedProject });
          versions[pCode] = nextVersion;

          const hist = this.versionHistory.get(pCode) ?? [];
          hist.push({
            version: nextVersion,
            publishedAt: now,
            publishedBy: caller.email,
            unitCount: versionedUnits.length,
          });
          this.versionHistory.set(pCode, hist);
        }

        const data: AdminPublishUnitsData = {
          projects: updatedProjects,
          publishedCount: payload.units.length,
          versions,
        };
        return { ok: true, action: req.action, data };
      }

      case 'admin.getProjectVersions': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่ดูประวัติเวอร์ชันราคาได้',
            req.action,
          );
        }

        const payload = (req.payload ??
          {}) as Partial<AdminGetProjectVersionsPayload>;
        if (!payload.projectCode) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุ projectCode',
            req.action,
          );
        }

        const pCode = payload.projectCode.trim().toUpperCase();
        const project = this.projects.get(pCode);
        const versions = [...(this.versionHistory.get(pCode) ?? [])].sort(
          (a, b) => b.version - a.version,
        );

        if (!project && versions.length === 0) {
          return makeError(
            'NOT_FOUND',
            `ไม่พบข้อมูลโครงการ ${pCode}`,
            req.action,
          );
        }

        const selectedVersion =
          payload.version ?? project?.priceVersion ?? versions[0]?.version ?? 1;

        const versionUnits = this.units
          .filter(
            (u) =>
              u.projectCode === pCode &&
              (u.priceVersion ?? 1) === selectedVersion,
          )
          .map((u) => ({ ...u }));

        const data: AdminGetProjectVersionsData = {
          projectCode: pCode,
          versions,
          selectedVersion,
          units: versionUnits,
        };
        return { ok: true, action: req.action, data };
      }

      case 'admin.users.list': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่ดูรายชื่อผู้ใช้งานได้',
            req.action,
          );
        }

        const data: AdminUsersListData = {
          users: [...this.users.values()].map((u) => ({ ...u })),
        };
        return { ok: true, action: req.action, data };
      }

      case 'admin.users.upsert': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่จัดการผู้ใช้งานได้',
            req.action,
          );
        }

        const payload = (req.payload ?? {}) as Partial<AdminUsersUpsertPayload>;
        const rawEmail = payload.user?.email?.trim().toLowerCase();
        if (!rawEmail || !payload.user?.name || !payload.user?.role) {
          return makeError(
            'BAD_REQUEST',
            'กรุณาระบุ email, name และ role ให้ครบถ้วน',
            req.action,
          );
        }

        const existing = this.users.get(rawEmail);
        const nextActive = payload.user.active ?? true;
        const nextRole = payload.user.role;

        if (
          existing &&
          existing.role === 'admin' &&
          existing.active &&
          (nextRole !== 'admin' || !nextActive) &&
          this.countOtherActiveAdmins(rawEmail) === 0
        ) {
          return makeError(
            'CANNOT_REMOVE_LAST_ADMIN',
            'ไม่สามารถปิดสิทธิ์หรือลดบทบาท Admin คนสุดท้ายของระบบได้',
            req.action,
          );
        }

        const saved: UserRecord = {
          email: rawEmail,
          name: payload.user.name.trim(),
          role: nextRole,
          active: nextActive,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        this.users.set(rawEmail, saved);

        const data: AdminUsersUpsertData = { user: { ...saved } };
        return { ok: true, action: req.action, data };
      }

      case 'admin.users.delete': {
        if (caller.role !== 'admin') {
          return makeError(
            'FORBIDDEN',
            'เฉพาะ Admin เท่านั้นที่ลบผู้ใช้งานได้',
            req.action,
          );
        }

        const payload = (req.payload ?? {}) as Partial<AdminUsersDeletePayload>;
        const targetEmail = payload.email?.trim().toLowerCase();
        if (!targetEmail) {
          return makeError('BAD_REQUEST', 'กรุณาระบุ email ที่ต้องการลบ', req.action);
        }

        const targetUser = this.users.get(targetEmail);
        if (!targetUser) {
          return makeError('NOT_FOUND', `ไม่พบบัญชี ${targetEmail}`, req.action);
        }

        if (
          targetUser.role === 'admin' &&
          targetUser.active &&
          this.countOtherActiveAdmins(targetEmail) === 0
        ) {
          return makeError(
            'CANNOT_REMOVE_LAST_ADMIN',
            'ไม่สามารถลบ Admin คนสุดท้ายของระบบได้',
            req.action,
          );
        }

        this.users.delete(targetEmail);
        const data: AdminUsersDeleteData = { deletedEmail: targetEmail };
        return { ok: true, action: req.action, data };
      }

      default: {
        return makeError('BAD_REQUEST', `Unsupported action: ${String(req.action)}`);
      }
    }
  }
}
