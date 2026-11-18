import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePriceListWorkbook } from '../shared/priceListImporter';
import { DealLogRecord, ProjectConfig, UnitRecord, UserRecord } from '../shared/types';
import { ApiService } from './apiService';

const DEFAULT_EXCEL_RELATIVE_PATH =
  'price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx';

let cachedWorkbookSeed: {
  projects: ProjectConfig[];
  units: UnitRecord[];
} | null = null;

function loadWorkbookSeed(): {
  projects: ProjectConfig[];
  units: UnitRecord[];
} {
  if (cachedWorkbookSeed) {
    return cachedWorkbookSeed;
  }

  const excelPath = resolve(process.cwd(), DEFAULT_EXCEL_RELATIVE_PATH);
  const buffer = new Uint8Array(readFileSync(excelPath));
  const parsed = parsePriceListWorkbook(buffer, {
    priceVersion: 1,
    isActiveVersion: true,
  });

  cachedWorkbookSeed = {
    projects: parsed.projects.map((p) => ({
      ...p,
      status: 'กำลังก่อสร้าง',
      active: true,
      priceVersion: 1,
    })),
    units: parsed.units,
  };

  return cachedWorkbookSeed;
}

export function createInitialUsers(): UserRecord[] {
  const createdAt = '2026-11-18T09:00:00+07:00';
  return [
    {
      email: 'bddhteam@gmail.com',
      name: 'BD Admin (Team)',
      role: 'admin',
      active: true,
      createdAt,
    },
    {
      email: 'chanyapat@scasset.com',
      name: 'พี่แนท (BD)',
      role: 'admin',
      active: true,
      createdAt,
    },
    {
      email: 'sales@scasset.com',
      name: 'ทีมขาย SC',
      role: 'sales',
      active: true,
      createdAt,
    },
  ];
}

/**
 * Sample deals matching Mockup 04 (`04_history.png`):
 * - CORM9 B0407 at 15:02 pending (9,837)
 * - CORM9 B0407 at 14:48 pass (58,718)
 * - CORM9 B0407 at 14:31 fail (-39,044)
 * - CORM9 E0408 at 11:05 pass (315,391)
 */
export function createInitialDeals(): DealLogRecord[] {
  return [
    {
      id: 'deal_seed_01',
      createdAt: '2026-11-18T15:02:00+07:00',
      projectCode: 'CORM9',
      unitCode: 'B0407',
      mode: 'C',
      sellingPrice: 2450000,
      commissionPct: 2,
      freeCommonYears: 1,
      extraPromo: 0,
      varianceThreshold: 50000,
      remainingVariance: 9837,
      status: 'approval',
      salesEmail: 'sales@scasset.com',
      salesName: 'ทีมขาย SC',
      actionType: 'request_approval',
      approvalStatus: 'pending',
    },
    {
      id: 'deal_seed_02',
      createdAt: '2026-11-18T14:48:00+07:00',
      projectCode: 'CORM9',
      unitCode: 'B0407',
      mode: 'A',
      sellingPrice: 2500000,
      commissionPct: 2,
      freeCommonYears: 1,
      extraPromo: 0,
      varianceThreshold: 50000,
      remainingVariance: 58718,
      status: 'pass',
      salesEmail: 'sales@scasset.com',
      salesName: 'ทีมขาย SC',
      actionType: 'save',
    },
    {
      id: 'deal_seed_03',
      createdAt: '2026-11-18T14:31:00+07:00',
      projectCode: 'CORM9',
      unitCode: 'B0407',
      mode: 'C',
      sellingPrice: 2400000,
      commissionPct: 2,
      freeCommonYears: 1,
      extraPromo: 0,
      varianceThreshold: 50000,
      remainingVariance: -39044,
      status: 'fail',
      salesEmail: 'sales@scasset.com',
      salesName: 'ทีมขาย SC',
      actionType: 'save',
    },
    {
      id: 'deal_seed_04',
      createdAt: '2026-11-18T11:05:00+07:00',
      projectCode: 'CORM9',
      unitCode: 'E0408',
      mode: 'C',
      sellingPrice: 2690000,
      commissionPct: 3,
      freeCommonYears: 1,
      extraPromo: 0,
      varianceThreshold: 50000,
      remainingVariance: 315391,
      status: 'pass',
      salesEmail: 'sales@scasset.com',
      salesName: 'ทีมขาย SC',
      actionType: 'save',
    },
  ];
}

/**
 * Creates a fresh isolated ApiService instance seeded from the real Excel workbook.
 */
export function createSeededApiService(): ApiService {
  const { projects, units } = loadWorkbookSeed();
  return new ApiService({
    projects,
    units,
    users: createInitialUsers(),
    deals: createInitialDeals(),
    allowDevAuth: true,
  });
}
