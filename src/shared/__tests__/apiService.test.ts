import { beforeEach, describe, expect, it } from 'vitest';
import {
  ApiService,
  READY_TO_MOVE_WARNING_MESSAGE,
  toSalesUnitRecord,
} from '../../server/apiService';
import { createSeededApiService } from '../../server/seedStore';
import {
  AdminGetProjectVersionsData,
  AdminPublishUnitsData,
  AdminUpsertProjectData,
  AdminUsersListData,
  CalcComputeData,
  CatalogBootstrapData,
  DealsCreateData,
  DealsListData,
  DealsRequestApprovalData,
  DealsReviewData,
  UnitRecord,
  UnitsGetData,
  UnitsSearchData,
} from '../types';

const ADMIN_EMAIL = 'bddhteam@gmail.com';
const NAT_ADMIN_EMAIL = 'chanyapat@scasset.com';
const SALES_EMAIL = 'sales@scasset.com';

let api: ApiService;

beforeEach(() => {
  api = createSeededApiService();
});

describe('apiService & seedStore', () => {
  it('seeds 7 projects (status กำลังก่อสร้าง, v1), 3,714 active units, and 4 Mockup 04 deals', async () => {
    const bootRes = await api.handleRequest({
      action: 'catalog.bootstrap',
      devEmail: ADMIN_EMAIL,
    });
    expect(bootRes.ok).toBe(true);
    if (!bootRes.ok) return;

    const boot = bootRes.data as CatalogBootstrapData;
    expect(boot.projects).toHaveLength(7);
    expect(boot.totalUnitCount).toBe(3714);
    for (const project of boot.projects) {
      expect(project.status).toBe('กำลังก่อสร้าง');
      expect(project.priceVersion).toBe(1);
    }

    const dealsRes = await api.handleRequest({
      action: 'deals.list',
      devEmail: SALES_EMAIL,
      payload: { filter: 'all' },
    });
    expect(dealsRes.ok).toBe(true);
    if (!dealsRes.ok) return;

    const { deals } = dealsRes.data as DealsListData;
    expect(deals).toHaveLength(4);
    expect(deals.map((d) => d.remainingVariance)).toEqual([
      9837,
      58718,
      -39044,
      315391,
    ]);
  });

  it('SECURITY: never leaks sgp (M), totalCostExpense (N), or sgpCost (O) to sales callers', async () => {
    const bootRes = await api.handleRequest({
      action: 'catalog.bootstrap',
      devEmail: SALES_EMAIL,
    });
    const searchRes = await api.handleRequest({
      action: 'units.search',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'CORM9', query: 'B0407', limit: 20 },
    });
    const getRes = await api.handleRequest({
      action: 'units.get',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'CORM9', unitCode: 'B0407' },
    });

    expect(bootRes.ok).toBe(true);
    expect(searchRes.ok).toBe(true);
    expect(getRes.ok).toBe(true);
    if (!bootRes.ok || !searchRes.ok || !getRes.ok) return;

    const bootData = bootRes.data as CatalogBootstrapData;
    const searchData = searchRes.data as UnitsSearchData;
    const getData = getRes.data as UnitsGetData;

    const allReturnedUnits = [
      ...bootData.recentUnits,
      ...searchData.units,
      getData.unit,
    ];
    expect(allReturnedUnits.length).toBeGreaterThanOrEqual(3);

    for (const unit of allReturnedUnits) {
      expect('sgp' in unit).toBe(false);
      expect('sgpCost' in unit).toBe(false);
      expect('totalCostExpense' in unit).toBe(false);
    }

    const serialized = JSON.stringify([bootRes, searchRes, getRes]);
    expect(serialized).not.toContain('sgp');
    expect(serialized).not.toContain('sgpCost');
    expect(serialized).not.toContain('totalCostExpense');
    expect(serialized).not.toContain('2326000');
    expect(serialized).not.toContain('2368887');

    // Direct check of toSalesUnitRecord helper
    const adminGet = await api.handleRequest({
      action: 'units.get',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'CORM9', unitCode: 'B0407' },
    });
    expect(adminGet.ok).toBe(true);
    if (!adminGet.ok) return;
    const fullUnit = (adminGet.data as UnitsGetData).unit as UnitRecord;
    const stripped = toSalesUnitRecord(fullUnit);
    expect('sgp' in stripped).toBe(false);
    expect('sgpCost' in stripped).toBe(false);
    expect('totalCostExpense' in stripped).toBe(false);
  });

  it('returns full sgp (2,326,000) and sgpCost (2,368,887.046) to admin on units.get', async () => {
    const res = await api.handleRequest({
      action: 'units.get',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'CORM9', unitCode: 'B0407' },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const unit = (res.data as UnitsGetData).unit as UnitRecord;
    expect(unit.sgp).toBe(2326000);
    expect(unit.sgpCost).toBeCloseTo(2368887.046, 3);
    expect(unit.totalCostExpense).toBeCloseTo(4101.889, 3);
  });

  it('rejects unauthorized callers and enforces FORBIDDEN when sales calls admin or review actions', async () => {
    const unauth = await api.handleRequest({
      action: 'auth.me',
      devEmail: 'unknown@scasset.com',
    });
    expect(unauth.ok).toBe(false);
    if (!unauth.ok) {
      expect(unauth.errorCode).toBe('UNAUTHORIZED');
    }

    const forbiddenActions = [
      {
        action: 'admin.upsertProject' as const,
        payload: { project: { projectCode: 'X1' } },
      },
      {
        action: 'admin.publishUnits' as const,
        payload: { units: [] },
      },
      {
        action: 'admin.getProjectVersions' as const,
        payload: { projectCode: 'CORM9' },
      },
      {
        action: 'admin.users.list' as const,
      },
      {
        action: 'admin.users.upsert' as const,
        payload: {
          user: {
            email: 'hack@scasset.com',
            name: 'Hacker',
            role: 'admin',
            active: true,
          },
        },
      },
      {
        action: 'admin.users.delete' as const,
        payload: { email: ADMIN_EMAIL },
      },
      {
        action: 'deals.review' as const,
        payload: { dealId: 'deal_seed_01', decision: 'approved' },
      },
    ];

    for (const req of forbiddenActions) {
      const res = await api.handleRequest({ ...req, devEmail: SALES_EMAIL });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errorCode).toBe('FORBIDDEN');
      }
    }
  });

  it('runs server-side calc.compute accurately while stripping unit secret fields for sales', async () => {
    const res = await api.handleRequest({
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
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const data = res.data as CalcComputeData;
    expect('sgp' in data.unit).toBe(false);
    expect('sgpCost' in data.unit).toBe(false);
    expect(data.result.ok).toBe(true);
    if (data.result.ok) {
      expect(data.result.sellingPrice).toBe(2500000);
      expect(data.result.remainingVariance).toBe(58718);
      expect(data.result.status).toBe('pass');
    }

    const blockedRes = await api.handleRequest({
      action: 'calc.compute',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'COLS',
        unitCode: 'SHOP1',
        mode: 'A',
        commissionPct: 2,
      },
    });
    expect(blockedRes.ok).toBe(true);
    if (!blockedRes.ok) return;
    const blockedData = blockedRes.data as CalcComputeData;
    expect(blockedData.result.ok).toBe(false);
    if (!blockedData.result.ok) {
      expect(blockedData.result.errorCode).toBe('UNIT_BLOCKED');
    }
  });

  it('supports dynamic project creation (TEST01) and Ready to move status transition warning', async () => {
    const createRes = await api.handleRequest({
      action: 'admin.upsertProject',
      devEmail: ADMIN_EMAIL,
      payload: {
        project: {
          projectCode: 'TEST01',
          projectName: 'โครงการทดสอบ 01',
          status: 'กำลังก่อสร้าง',
        },
      },
    });
    expect(createRes.ok).toBe(true);
    if (!createRes.ok) return;

    const createData = createRes.data as AdminUpsertProjectData;
    expect(createData.project.projectCode).toBe('TEST01');
    expect(createData.readyToMoveWarning).toBe(false);

    const bootAfter = await api.handleRequest({
      action: 'catalog.bootstrap',
      devEmail: SALES_EMAIL,
    });
    expect(bootAfter.ok).toBe(true);
    if (!bootAfter.ok) return;
    const projects = (bootAfter.data as CatalogBootstrapData).projects;
    expect(projects).toHaveLength(8);
    expect(projects.some((p) => p.projectCode === 'TEST01')).toBe(true);

    const transitionRes = await api.handleRequest({
      action: 'admin.upsertProject',
      devEmail: ADMIN_EMAIL,
      payload: {
        project: {
          projectCode: 'TEST01',
          status: 'Ready to move',
        },
      },
    });
    expect(transitionRes.ok).toBe(true);
    if (!transitionRes.ok) return;

    const transitionData = transitionRes.data as AdminUpsertProjectData;
    expect(transitionData.readyToMoveWarning).toBe(true);
    expect(transitionData.warningMessage).toBe(READY_TO_MOVE_WARNING_MESSAGE);
  });

  it('increments priceVersion from v1 to v2 on admin.publishUnits while keeping v1 history queryable', async () => {
    const v1Res = await api.handleRequest({
      action: 'admin.getProjectVersions',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'RFS63' },
    });
    expect(v1Res.ok).toBe(true);
    if (!v1Res.ok) return;
    const v1Data = v1Res.data as AdminGetProjectVersionsData;
    expect(v1Data.selectedVersion).toBe(1);
    expect(v1Data.units).toHaveLength(347);

    const v2Units: UnitRecord[] = v1Data.units.slice(0, 10).map((u) => ({
      ...u,
      scPrice: (u.scPrice ?? 3000000) + 50000,
    }));

    const pubRes = await api.handleRequest({
      action: 'admin.publishUnits',
      devEmail: ADMIN_EMAIL,
      payload: {
        targetProjectCode: 'RFS63',
        units: v2Units,
      },
    });
    expect(pubRes.ok).toBe(true);
    if (!pubRes.ok) return;
    const pubData = pubRes.data as AdminPublishUnitsData;
    expect(pubData.versions.RFS63).toBe(2);
    expect(pubData.projects[0]?.unitCount).toBe(10);

    const searchActive = await api.handleRequest({
      action: 'units.search',
      devEmail: SALES_EMAIL,
      payload: { projectCode: 'RFS63', limit: 500 },
    });
    expect(searchActive.ok).toBe(true);
    if (!searchActive.ok) return;
    expect((searchActive.data as UnitsSearchData).total).toBe(10);

    const historyV1 = await api.handleRequest({
      action: 'admin.getProjectVersions',
      devEmail: ADMIN_EMAIL,
      payload: { projectCode: 'RFS63', version: 1 },
    });
    expect(historyV1.ok).toBe(true);
    if (!historyV1.ok) return;
    const histData = historyV1.data as AdminGetProjectVersionsData;
    expect(histData.versions.map((v) => v.version)).toEqual([2, 1]);
    expect(histData.selectedVersion).toBe(1);
    expect(histData.units).toHaveLength(347);
  });

  it('executes full deal workflow: create -> requestApproval -> list filters -> admin review', async () => {
    const createRes = await api.handleRequest({
      action: 'deals.create',
      devEmail: SALES_EMAIL,
      payload: {
        projectCode: 'CORM9',
        unitCode: 'B0407',
        mode: 'C',
        sellingPrice: 2450000,
        commissionPct: 2,
        freeCommonYears: 1,
        extraPromo: 0,
        actionType: 'save',
      },
    });
    expect(createRes.ok).toBe(true);
    if (!createRes.ok) return;
    const createdDeal = (createRes.data as DealsCreateData).deal;
    expect(createdDeal.remainingVariance).toBe(9837);
    expect(createdDeal.status).toBe('approval');
    expect(createdDeal.approvalStatus).toBeUndefined();

    const reqAppRes = await api.handleRequest({
      action: 'deals.requestApproval',
      devEmail: SALES_EMAIL,
      payload: { dealId: createdDeal.id, note: 'ลูกค้าขอต่อรองเพิ่ม' },
    });
    expect(reqAppRes.ok).toBe(true);
    if (!reqAppRes.ok) return;
    expect(
      (reqAppRes.data as DealsRequestApprovalData).deal.approvalStatus,
    ).toBe('pending');

    const pendingRes = await api.handleRequest({
      action: 'deals.list',
      devEmail: ADMIN_EMAIL,
      payload: { filter: 'pending' },
    });
    expect(pendingRes.ok).toBe(true);
    if (!pendingRes.ok) return;
    const pendingDeals = (pendingRes.data as DealsListData).deals;
    expect(pendingDeals.some((d) => d.id === createdDeal.id)).toBe(true);

    const reviewRes = await api.handleRequest({
      action: 'deals.review',
      devEmail: NAT_ADMIN_EMAIL,
      payload: {
        dealId: createdDeal.id,
        decision: 'approved',
        note: 'อนุมัติปิดเคส',
      },
    });
    expect(reviewRes.ok).toBe(true);
    if (!reviewRes.ok) return;
    const reviewed = (reviewRes.data as DealsReviewData).deal;
    expect(reviewed.approvalStatus).toBe('approved');
    expect(reviewed.approvedBy).toBe(NAT_ADMIN_EMAIL);
    expect(reviewed.approvedAt).toBeDefined();

    const mineRes = await api.handleRequest({
      action: 'deals.list',
      devEmail: NAT_ADMIN_EMAIL,
      payload: { filter: 'mine' },
    });
    expect(mineRes.ok).toBe(true);
    if (!mineRes.ok) return;
    expect((mineRes.data as DealsListData).deals).toHaveLength(0);
  });

  it('manages users via admin.users.list / upsert / delete and blocks removing the last active admin', async () => {
    const listRes = await api.handleRequest({
      action: 'admin.users.list',
      devEmail: ADMIN_EMAIL,
    });
    expect(listRes.ok).toBe(true);
    if (!listRes.ok) return;
    expect((listRes.data as AdminUsersListData).users).toHaveLength(3);

    // Add a new admin user
    const upsertRes = await api.handleRequest({
      action: 'admin.users.upsert',
      devEmail: ADMIN_EMAIL,
      payload: {
        user: {
          email: 'pnat.extra@scasset.com',
          name: 'P Nat Extra',
          role: 'admin',
          active: true,
        },
      },
    });
    expect(upsertRes.ok).toBe(true);

    // Delete secondary admins & sales user
    expect(
      (
        await api.handleRequest({
          action: 'admin.users.delete',
          devEmail: ADMIN_EMAIL,
          payload: { email: NAT_ADMIN_EMAIL },
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await api.handleRequest({
          action: 'admin.users.delete',
          devEmail: ADMIN_EMAIL,
          payload: { email: 'pnat.extra@scasset.com' },
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await api.handleRequest({
          action: 'admin.users.delete',
          devEmail: ADMIN_EMAIL,
          payload: { email: SALES_EMAIL },
        })
      ).ok,
    ).toBe(true);

    // Attempting to delete or demote the last active admin (bddhteam@gmail.com) must fail
    const delLast = await api.handleRequest({
      action: 'admin.users.delete',
      devEmail: ADMIN_EMAIL,
      payload: { email: ADMIN_EMAIL },
    });
    expect(delLast.ok).toBe(false);
    if (!delLast.ok) {
      expect(delLast.errorCode).toBe('CANNOT_REMOVE_LAST_ADMIN');
    }

    const demoteLast = await api.handleRequest({
      action: 'admin.users.upsert',
      devEmail: ADMIN_EMAIL,
      payload: {
        user: {
          email: ADMIN_EMAIL,
          name: 'BD Admin',
          role: 'sales',
          active: true,
        },
      },
    });
    expect(demoteLast.ok).toBe(false);
    if (!demoteLast.ok) {
      expect(demoteLast.errorCode).toBe('CANNOT_REMOVE_LAST_ADMIN');
    }
  });
});
