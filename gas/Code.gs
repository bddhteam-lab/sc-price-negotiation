/**
 * SC Price Negotiation PWA — Google Apps Script Backend
 * Owner account: bddhteam@gmail.com
 *
 * 4-Sheet Schema:
 * - Projects
 * - Units (versioned: priceVersion, isActiveVersion)
 * - Users (email, name, role, active, createdAt)
 * - Log (deal calculation & approval workflow history)
 */

var DEFAULT_SPREADSHEET_ID = '14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg';

var SHEET_NAMES = {
  PROJECTS: 'Projects',
  UNITS: 'Units',
  USERS: 'Users',
  LOG: 'Log',
};

var HEADERS = {
  Projects: [
    'projectCode',
    'projectName',
    'status',
    'sinkingRatePerSqm',
    'commonFeeRatePerSqmMonth',
    'transferFeePct',
    'kFactor',
    'vatPct',
    'defaultVariance',
    'priceRoundStep',
    'comStepPct',
    'sinkingRateDisplay',
    'commonFeeRateDisplay',
    'specialRules',
    'unitCount',
    'priceVersion',
    'active',
    'updatedAt',
  ],
  Units: [
    'id',
    'projectCode',
    'unitCode',
    'combineCode',
    'unitStatus',
    'decoration',
    'building',
    'floor',
    'unitSuffix',
    'houseNumber',
    'roomCategory',
    'unitType',
    'areaSqm',
    'sgp',
    'totalCostExpense',
    'sgpCost',
    'scPrice',
    'agentNetPrice',
    'sinkingRatePerSqm',
    'commonFeeRatePerSqmMonth',
    'commonFee1Y',
    'sinkingFund',
    'transferFee',
    'isBlocked',
    'blockReason',
    'priceVersion',
    'isActiveVersion',
    'publishedAt',
    'publishedBy',
  ],
  Users: ['email', 'name', 'role', 'active', 'createdAt'],
  Log: [
    'id',
    'createdAt',
    'projectCode',
    'unitCode',
    'mode',
    'sellingPrice',
    'commissionPct',
    'freeCommonYears',
    'extraPromo',
    'varianceThreshold',
    'remainingVariance',
    'status',
    'salesEmail',
    'salesName',
    'actionType',
    'approvalStatus',
    'approvedBy',
    'approvedAt',
    'note',
  ],
};

var DEFAULT_CONFIG = {
  transferFeePct: 1,
  kFactor: 1.046,
  vatPct: 7,
  defaultVariance: 50000,
  priceRoundStep: 10000,
  comStepPct: 1,
};

var READY_TO_MOVE_WARNING_MESSAGE =
  'เมื่อเปลี่ยนสถานะเป็น Ready to move ต้องอัปเดตต้นทุนในช่อง O ให้รวมฟรีส่วนกลางปีแรกด้วย';

var WRITE_ACTIONS = {
  'deals.create': true,
  'deals.requestApproval': true,
  'deals.review': true,
  'admin.upsertProject': true,
  'admin.publishUnits': true,
  'admin.users.upsert': true,
  'admin.users.delete': true,
};

/**
 * Run once manually (or automatically) to initialize all 4 sheets and seed initial Users & Log deals.
 */
function setupSheets() {
  var ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      var headers = HEADERS[name];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });

  var usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (usersSheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    usersSheet.getRange(2, 1, 3, HEADERS.Users.length).setValues([
      ['bddhteam@gmail.com', 'BD Admin (Team)', 'admin', true, now],
      ['chanyapat@scasset.com', 'พี่แนท (BD)', 'admin', true, now],
      ['sales@scasset.com', 'ทีมขาย SC', 'sales', true, now],
    ]);
  }

  var logSheet = ss.getSheetByName(SHEET_NAMES.LOG);
  if (logSheet.getLastRow() <= 1) {
    logSheet.getRange(2, 1, 4, HEADERS.Log.length).setValues([
      [
        'deal_seed_01',
        '2026-11-18T15:02:00+07:00',
        'CORM9',
        'B0407',
        'C',
        2450000,
        2,
        1,
        0,
        50000,
        9837,
        'approval',
        'sales@scasset.com',
        'ทีมขาย SC',
        'request_approval',
        'pending',
        '',
        '',
        '',
      ],
      [
        'deal_seed_02',
        '2026-11-18T14:48:00+07:00',
        'CORM9',
        'B0407',
        'A',
        2500000,
        2,
        1,
        0,
        50000,
        58718,
        'pass',
        'sales@scasset.com',
        'ทีมขาย SC',
        'save',
        '',
        '',
        '',
        '',
      ],
      [
        'deal_seed_03',
        '2026-11-18T14:31:00+07:00',
        'CORM9',
        'B0407',
        'C',
        2400000,
        2,
        1,
        0,
        50000,
        -39044,
        'fail',
        'sales@scasset.com',
        'ทีมขาย SC',
        'save',
        '',
        '',
        '',
        '',
      ],
      [
        'deal_seed_04',
        '2026-11-18T11:05:00+07:00',
        'CORM9',
        'E0408',
        'C',
        2690000,
        3,
        1,
        0,
        50000,
        315391,
        'pass',
        'sales@scasset.com',
        'ทีมขาย SC',
        'save',
        '',
        '',
        '',
        '',
      ],
    ]);
  }
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'sc-price-negotiation-gas',
    timestamp: new Date().toISOString(),
  });
}

/**
 * CORS-safe POST handler supporting text/plain and application/json payloads.
 */
function doPost(e) {
  var lock = null;
  var action = undefined;

  try {
    var rawBody =
      e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var req = JSON.parse(rawBody);
    action = req.action;

    if (!req || !action) {
      return jsonResponse_(
        makeError_('BAD_REQUEST', 'Missing API action', undefined),
      );
    }

    if (WRITE_ACTIONS[action]) {
      lock = LockService.getScriptLock();
      lock.waitLock(30000);
    }

    var caller = authenticateCaller_(req);
    if (!caller) {
      return jsonResponse_(
        makeError_(
          'UNAUTHORIZED',
          'กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์',
          action,
        ),
      );
    }

    var response = dispatchAction_(req, caller);
    return jsonResponse_(response);
  } catch (err) {
    return jsonResponse_(
      makeError_(
        'INTERNAL_ERROR',
        err && err.message ? err.message : String(err),
        action,
      ),
    );
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (_ignore) {}
    }
  }
}

function dispatchAction_(req, caller) {
  var action = req.action;
  var payload = req.payload || {};

  switch (action) {
    case 'auth.me':
      return { ok: true, action: action, data: { user: caller } };

    case 'catalog.bootstrap':
      return handleCatalogBootstrap_(action, payload, caller);

    case 'units.search':
      return handleUnitsSearch_(action, payload, caller);

    case 'units.get':
      return handleUnitsGet_(action, payload, caller);

    case 'calc.compute':
      return handleCalcCompute_(action, payload, caller);

    case 'deals.list':
      return handleDealsList_(action, payload, caller);

    case 'deals.create':
      return handleDealsCreate_(action, payload, caller);

    case 'deals.requestApproval':
      return handleDealsRequestApproval_(action, payload, caller);

    case 'deals.review':
      return handleDealsReview_(action, payload, caller);

    case 'admin.upsertProject':
      return handleAdminUpsertProject_(action, payload, caller);

    case 'admin.publishUnits':
      return handleAdminPublishUnits_(action, payload, caller);

    case 'admin.getProjectVersions':
      return handleAdminGetProjectVersions_(action, payload, caller);

    case 'admin.users.list':
      return handleAdminUsersList_(action, caller);

    case 'admin.users.upsert':
      return handleAdminUsersUpsert_(action, payload, caller);

    case 'admin.users.delete':
      return handleAdminUsersDelete_(action, payload, caller);

    default:
      return makeError_('BAD_REQUEST', 'Unsupported action: ' + action, action);
  }
}

// -----------------------------------------------------------------------------
// Authentication & Role Security
// -----------------------------------------------------------------------------

function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return null;
  }

  var url =
    'https://oauth2.googleapis.com/tokeninfo?id_token=' +
    encodeURIComponent(idToken);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    return null;
  }

  var info = JSON.parse(res.getContentText() || '{}');
  var verified =
    info.email_verified === true || info.email_verified === 'true';
  if (!verified || !info.email) {
    return null;
  }

  var expectedClientId = PropertiesService.getScriptProperties().getProperty(
    'GOOGLE_CLIENT_ID',
  );
  if (expectedClientId && info.aud !== expectedClientId) {
    return null;
  }

  if (info.exp) {
    var nowSec = Math.floor(Date.now() / 1000);
    if (Number(info.exp) < nowSec) {
      return null;
    }
  }

  return String(info.email).trim().toLowerCase();
}

function authenticateCaller_(req) {
  var email = null;

  if (req.idToken) {
    email = verifyGoogleIdToken(req.idToken);
    if (!email) {
      return null;
    }
  } else {
    var rawEmail = req.devEmail || req.email;
    if (rawEmail && typeof rawEmail === 'string') {
      email = rawEmail.trim().toLowerCase();
    }
  }

  if (!email) {
    return null;
  }

  var users = readUsers_();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === email && users[i].active) {
      return users[i];
    }
  }
  return null;
}

/**
 * Strips sensitive cost columns M (sgp), N (totalCostExpense), and O (sgpCost)
 * from UnitRecord before returning to non-admin callers.
 */
function toSalesUnitRecord(unit) {
  var copy = {};
  var keys = Object.keys(unit);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === 'sgp' || k === 'totalCostExpense' || k === 'sgpCost') {
      continue;
    }
    copy[k] = unit[k];
  }
  delete copy.sgp;
  delete copy.totalCostExpense;
  delete copy.sgpCost;

  if ('sgp' in copy || 'totalCostExpense' in copy || 'sgpCost' in copy) {
    throw new Error('Security invariant violated: sensitive unit keys still present');
  }
  return copy;
}

function sanitizeUnitForRole_(unit, role) {
  if (role === 'admin') {
    return cloneObj_(unit);
  }
  return toSalesUnitRecord(unit);
}

// -----------------------------------------------------------------------------
// Pure Calculation Engine Parity (`src/shared/calcEngine.ts`)
// -----------------------------------------------------------------------------

function actualComCostRateGas_(comPct, vatPct, kFactor) {
  var vatMultiplier = 1 + vatPct / 100;
  return (comPct / 100) * vatMultiplier * kFactor;
}

function calculateDealGas(input) {
  var unit = input.unit;
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
    !isFinite(Number(unit.sgpCost)) ||
    Number(unit.sgpCost) <= 0
  ) {
    return {
      ok: false,
      errorCode: 'MISSING_SGP_COST',
      errorMessage:
        'ไม่พบข้อมูลต้นทุน (ช่อง O) หรือต้นทุนเป็น 0 ไม่สามารถคำนวณได้',
    };
  }

  var project = input.project || {};
  var k =
    project.kFactor !== undefined ? Number(project.kFactor) : DEFAULT_CONFIG.kFactor;
  var vatPct =
    project.vatPct !== undefined ? Number(project.vatPct) : DEFAULT_CONFIG.vatPct;
  var defaultVariance =
    project.defaultVariance !== undefined
      ? Number(project.defaultVariance)
      : DEFAULT_CONFIG.defaultVariance;
  var priceRoundStep =
    project.priceRoundStep !== undefined
      ? Number(project.priceRoundStep)
      : DEFAULT_CONFIG.priceRoundStep;
  var comStepPct =
    project.comStepPct !== undefined
      ? Number(project.comStepPct)
      : DEFAULT_CONFIG.comStepPct;

  var sgpCost = Number(unit.sgpCost);
  var commonFee1Y = Number(unit.commonFee1Y || 0);
  var freeCommonYears =
    input.freeCommonYears !== undefined ? Number(input.freeCommonYears) : 0;
  var extraPromo = input.extraPromo !== undefined ? Number(input.extraPromo) : 0;
  var variance =
    input.variance !== undefined ? Number(input.variance) : defaultVariance;

  var vatMultiplier = 1 + vatPct / 100;
  var freeCommonAddition = freeCommonYears * commonFee1Y;
  var minRequiredAmount =
    sgpCost + (extraPromo + freeCommonAddition + variance) * k;

  var sellingPrice = 0;
  var effectiveCommissionPct = 0;
  var diffFromAgentPrice;
  var diffFromAgentPct;
  var ceilingPct;
  var rawAgentComPct;
  var canGiveCommission;
  var nextStepComPct;
  var nextStepActualCostPct;
  var nextStepExcessPct;

  if (input.mode === 'A') {
    var comPctA = Number(input.commissionPct);
    if (!isFinite(comPctA) || comPctA < 0) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุค่าคอม Agent (%) ให้ถูกต้อง',
      };
    }
    var comRateA = actualComCostRateGas_(comPctA, vatPct, k);
    if (comRateA >= 1) {
      return {
        ok: false,
        errorCode: 'COMMISSION_RATE_TOO_HIGH',
        errorMessage: 'อัตราค่าคอมมิชชั่นรวม VAT และค่า K ต้องน้อยกว่า 100%',
      };
    }
    var rawPrice = minRequiredAmount / (1 - comRateA);
    sellingPrice = Math.ceil(rawPrice / priceRoundStep) * priceRoundStep;
    effectiveCommissionPct = comPctA;

    if (unit.agentNetPrice !== null && unit.agentNetPrice !== undefined && Number(unit.agentNetPrice) > 0) {
      var agentNet = Number(unit.agentNetPrice);
      diffFromAgentPrice = agentNet - sellingPrice;
      diffFromAgentPct = ((agentNet - sellingPrice) / agentNet) * 100;
    }
  } else if (input.mode === 'B') {
    var priceB = Number(input.sellingPrice);
    if (!isFinite(priceB) || priceB <= 0) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุราคาขายให้ถูกต้อง',
      };
    }
    sellingPrice = priceB;
    var ceilingFraction = (sellingPrice - minRequiredAmount) / sellingPrice;
    ceilingPct = ceilingFraction * 100;
    rawAgentComPct = ceilingPct / (vatMultiplier * k);

    if (rawAgentComPct < 0) {
      effectiveCommissionPct = 0;
      canGiveCommission = false;
      nextStepComPct = comStepPct;
    } else {
      effectiveCommissionPct =
        Math.floor((rawAgentComPct + 1e-9) / comStepPct) * comStepPct;
      canGiveCommission = true;
      nextStepComPct = effectiveCommissionPct + comStepPct;
    }
    nextStepActualCostPct = nextStepComPct * vatMultiplier * k;
    nextStepExcessPct = nextStepActualCostPct - ceilingPct;
  } else {
    var priceC = Number(input.sellingPrice);
    var comPctC = Number(input.commissionPct);
    if (!isFinite(priceC) || priceC <= 0 || !isFinite(comPctC) || comPctC < 0) {
      return {
        ok: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'กรุณาระบุราคาขายและค่าคอม Agent (%) ให้ถูกต้อง',
      };
    }
    sellingPrice = priceC;
    effectiveCommissionPct = comPctC;
  }

  var effectiveComRate = actualComCostRateGas_(
    effectiveCommissionPct,
    vatPct,
    k,
  );
  var commissionAmountExact = sellingPrice * effectiveComRate;
  var remainingExact =
    sellingPrice -
    commissionAmountExact -
    sgpCost -
    extraPromo -
    freeCommonAddition;
  var remainingVariance = Math.round(remainingExact);

  var status = 'pass';
  var statusLabel = 'ผ่าน';
  if (remainingExact < 0) {
    status = 'fail';
    statusLabel = 'ไม่ผ่าน';
  } else if (remainingExact < variance) {
    status = 'approval';
    statusLabel = 'ต้องขออนุมัติ';
  }

  var result = {
    ok: true,
    mode: input.mode,
    status: status,
    statusLabel: statusLabel,
    sellingPrice: sellingPrice,
    effectiveCommissionPct: effectiveCommissionPct,
    remainingVariance: remainingVariance,
    remainingExact: remainingExact,
    varianceThreshold: variance,
    minRequiredAmount: minRequiredAmount,
    breakdown: {
      sellingPrice: Math.round(sellingPrice),
      commissionPct: effectiveCommissionPct,
      effectiveComRatePct: Number((effectiveComRate * 100).toFixed(2)),
      commissionAmount: Math.round(commissionAmountExact),
      sgpPlusCost: Math.round(sgpCost),
      freeCommonYears: freeCommonYears,
      freeCommonAmount: Math.round(freeCommonAddition),
      extraPromoAmount: Math.round(extraPromo),
      remainingVariance: remainingVariance,
    },
  };

  if (diffFromAgentPrice !== undefined) {
    result.diffFromAgentPrice = diffFromAgentPrice;
    result.diffFromAgentPct = diffFromAgentPct;
  }
  if (ceilingPct !== undefined) {
    result.ceilingPct = ceilingPct;
    result.rawAgentComPct = rawAgentComPct;
    result.canGiveCommission = canGiveCommission;
    result.nextStepComPct = nextStepComPct;
    result.nextStepActualCostPct = nextStepActualCostPct;
    result.nextStepExcessPct = nextStepExcessPct;
  }

  return result;
}

// -----------------------------------------------------------------------------
// Endpoint Handlers
// -----------------------------------------------------------------------------

function handleCatalogBootstrap_(action, payload, caller) {
  var includeInactive =
    caller.role === 'admin' && Boolean(payload.includeInactive);
  var allProjects = readProjects_();
  var visibleProjects = allProjects.filter(function (p) {
    return includeInactive || p.active !== false;
  });

  var visibleCodes = {};
  visibleProjects.forEach(function (p) {
    visibleCodes[p.projectCode] = true;
  });

  var activeUnits = readUnits_().filter(function (u) {
    return u.isActiveVersion !== false && visibleCodes[u.projectCode];
  });

  var deals = readDeals_();
  var recentUnits = [];
  var seen = {};

  for (var i = 0; i < deals.length && recentUnits.length < 2; i++) {
    var d = deals[i];
    var key = d.projectCode + ':' + d.unitCode;
    if (seen[key]) continue;
    for (var j = 0; j < activeUnits.length; j++) {
      if (
        activeUnits[j].projectCode === d.projectCode &&
        activeUnits[j].unitCode === d.unitCode
      ) {
        seen[key] = true;
        recentUnits.push(sanitizeUnitForRole_(activeUnits[j], caller.role));
        break;
      }
    }
  }

  for (var k = 0; k < activeUnits.length && recentUnits.length < 2; k++) {
    if (!seen[activeUnits[k].id]) {
      seen[activeUnits[k].id] = true;
      recentUnits.push(sanitizeUnitForRole_(activeUnits[k], caller.role));
    }
  }

  return {
    ok: true,
    action: action,
    data: {
      user: caller,
      projects: visibleProjects,
      recentUnits: recentUnits,
      totalUnitCount: activeUnits.length,
    },
  };
}

function handleUnitsSearch_(action, payload, caller) {
  var projectFilter = payload.projectCode
    ? String(payload.projectCode).trim().toUpperCase()
    : '';
  var q = payload.query ? String(payload.query).trim().toLowerCase() : '';
  var includeBlocked =
    payload.includeBlocked !== undefined ? Boolean(payload.includeBlocked) : true;
  var limit = Math.min(Math.max(Number(payload.limit || 50), 1), 500);

  var activeCodes = {};
  readProjects_().forEach(function (p) {
    if (p.active !== false) activeCodes[p.projectCode] = true;
  });

  var matched = readUnits_().filter(function (u) {
    if (u.isActiveVersion === false) return false;
    if (!activeCodes[u.projectCode]) return false;
    if (projectFilter && u.projectCode !== projectFilter) return false;
    if (!includeBlocked && u.isBlocked) return false;
    if (!q) return true;
    return (
      u.unitCode.toLowerCase().indexOf(q) !== -1 ||
      u.combineCode.toLowerCase().indexOf(q) !== -1 ||
      u.projectCode.toLowerCase().indexOf(q) !== -1 ||
      (u.houseNumber && u.houseNumber.toLowerCase().indexOf(q) !== -1) ||
      (u.roomCategory && u.roomCategory.toLowerCase().indexOf(q) !== -1) ||
      (u.unitType && u.unitType.toLowerCase().indexOf(q) !== -1)
    );
  });

  var sliced = matched.slice(0, limit).map(function (u) {
    return sanitizeUnitForRole_(u, caller.role);
  });

  return {
    ok: true,
    action: action,
    data: {
      units: sliced,
      total: matched.length,
    },
  };
}

function handleUnitsGet_(action, payload, caller) {
  if (!payload.projectCode || !payload.unitCode) {
    return makeError_(
      'BAD_REQUEST',
      'กรุณาระบุ projectCode และ unitCode',
      action,
    );
  }
  var pCode = String(payload.projectCode).trim().toUpperCase();
  var uCode = String(payload.unitCode).trim().toUpperCase();

  var project = findProject_(pCode);
  var unit = findActiveUnit_(pCode, uCode);
  if (!project || !unit) {
    return makeError_(
      'NOT_FOUND',
      'ไม่พบข้อมูลห้อง ' + pCode + ' ' + uCode,
      action,
    );
  }

  return {
    ok: true,
    action: action,
    data: {
      unit: sanitizeUnitForRole_(unit, caller.role),
      project: project,
    },
  };
}

function handleCalcCompute_(action, payload, caller) {
  if (!payload.projectCode || !payload.unitCode || !payload.mode) {
    return makeError_(
      'BAD_REQUEST',
      'กรุณาระบุ projectCode, unitCode และ mode',
      action,
    );
  }
  var pCode = String(payload.projectCode).trim().toUpperCase();
  var uCode = String(payload.unitCode).trim().toUpperCase();

  var project = findProject_(pCode);
  var unit = findActiveUnit_(pCode, uCode);
  if (!project || !unit) {
    return makeError_(
      'NOT_FOUND',
      'ไม่พบข้อมูลห้อง ' + pCode + ' ' + uCode,
      action,
    );
  }

  var effectiveUnit = applyProjectSpecialRules_(unit, project);
  var result = calculateDealGas({
    mode: payload.mode,
    unit: effectiveUnit,
    project: project,
    commissionPct: payload.commissionPct,
    sellingPrice: payload.sellingPrice,
    freeCommonYears: payload.freeCommonYears,
    extraPromo: payload.extraPromo,
    variance: payload.variance,
  });

  return {
    ok: true,
    action: action,
    data: {
      result: result,
      unit: sanitizeUnitForRole_(effectiveUnit, caller.role),
      project: project,
    },
  };
}

function handleDealsList_(action, payload, caller) {
  var filter = payload.filter || 'all';
  var pFilter = payload.projectCode
    ? String(payload.projectCode).trim().toUpperCase()
    : '';

  var deals = readDeals_()
    .filter(function (d) {
      if (pFilter && d.projectCode !== pFilter) return false;
      if (filter === 'pending') return d.approvalStatus === 'pending';
      if (filter === 'mine') {
        return d.salesEmail.toLowerCase() === caller.email.toLowerCase();
      }
      return true;
    })
    .sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return {
    ok: true,
    action: action,
    data: { deals: deals },
  };
}

function handleDealsCreate_(action, payload, caller) {
  if (!payload.projectCode || !payload.unitCode || !payload.mode) {
    return makeError_('BAD_REQUEST', 'กรุณาระบุข้อมูลดีลให้ครบถ้วน', action);
  }

  var pCode = String(payload.projectCode).trim().toUpperCase();
  var uCode = String(payload.unitCode).trim().toUpperCase();
  var project = findProject_(pCode);
  var unit = findActiveUnit_(pCode, uCode);
  if (!project || !unit) {
    return makeError_(
      'NOT_FOUND',
      'ไม่พบข้อมูลห้อง ' + pCode + ' ' + uCode,
      action,
    );
  }

  var effectiveUnit = applyProjectSpecialRules_(unit, project);
  var calcResult = calculateDealGas({
    mode: payload.mode,
    unit: effectiveUnit,
    project: project,
    commissionPct: payload.commissionPct,
    sellingPrice: payload.sellingPrice,
    freeCommonYears: payload.freeCommonYears,
    extraPromo: payload.extraPromo,
    variance: payload.variance,
  });

  if (!calcResult.ok) {
    return makeError_('CALC_ERROR', calcResult.errorMessage, action);
  }

  var actionType = payload.actionType || 'save';
  var deal = {
    id: 'deal_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    createdAt: new Date().toISOString(),
    projectCode: unit.projectCode,
    unitCode: unit.unitCode,
    mode: payload.mode,
    sellingPrice: calcResult.sellingPrice,
    commissionPct: calcResult.effectiveCommissionPct,
    freeCommonYears: Number(payload.freeCommonYears || 0),
    extraPromo: Number(payload.extraPromo || 0),
    varianceThreshold: calcResult.varianceThreshold,
    remainingVariance: calcResult.remainingVariance,
    status: calcResult.status,
    salesEmail: caller.email,
    salesName: caller.name,
    actionType: actionType,
    approvalStatus: actionType === 'request_approval' ? 'pending' : '',
    approvedBy: '',
    approvedAt: '',
    note: payload.note || '',
  };

  var logSheet = getSheet_(SHEET_NAMES.LOG);
  logSheet.appendRow(objectToRow_(HEADERS.Log, deal));

  return { ok: true, action: action, data: { deal: deal } };
}

function handleDealsRequestApproval_(action, payload, caller) {
  if (!payload.dealId) {
    return makeError_('BAD_REQUEST', 'กรุณาระบุ dealId', action);
  }

  var sheet = getSheet_(SHEET_NAMES.LOG);
  var rows = readSheetObjects_(sheet, HEADERS.Log);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].obj.id === payload.dealId) {
      var deal = rows[i].obj;
      if (
        caller.role === 'sales' &&
        deal.salesEmail.toLowerCase() !== caller.email.toLowerCase()
      ) {
        return makeError_(
          'FORBIDDEN',
          'ไม่สามารถส่งขออนุมัติดีลของผู้อื่นได้',
          action,
        );
      }
      deal.actionType = 'request_approval';
      deal.approvalStatus = 'pending';
      if (payload.note !== undefined) deal.note = payload.note;

      sheet
        .getRange(rows[i].rowIndex, 1, 1, HEADERS.Log.length)
        .setValues([objectToRow_(HEADERS.Log, deal)]);
      return { ok: true, action: action, data: { deal: deal } };
    }
  }
  return makeError_('NOT_FOUND', 'ไม่พบรายการดีลที่ระบุ', action);
}

function handleDealsReview_(action, payload, caller) {
  if (caller.role !== 'admin' && caller.role !== 'approver') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin หรือ Approver เท่านั้นที่อนุมัติดีลได้',
      action,
    );
  }
  if (
    !payload.dealId ||
    (payload.decision !== 'approved' && payload.decision !== 'rejected')
  ) {
    return makeError_(
      'BAD_REQUEST',
      'กรุณาระบุ dealId และ decision (approved / rejected)',
      action,
    );
  }

  var sheet = getSheet_(SHEET_NAMES.LOG);
  var rows = readSheetObjects_(sheet, HEADERS.Log);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].obj.id === payload.dealId) {
      var deal = rows[i].obj;
      deal.approvalStatus = payload.decision;
      deal.approvedBy = caller.email;
      deal.approvedAt = new Date().toISOString();
      if (payload.note !== undefined) deal.note = payload.note;

      sheet
        .getRange(rows[i].rowIndex, 1, 1, HEADERS.Log.length)
        .setValues([objectToRow_(HEADERS.Log, deal)]);
      return { ok: true, action: action, data: { deal: deal } };
    }
  }
  return makeError_('NOT_FOUND', 'ไม่พบรายการดีลที่ระบุ', action);
}

function handleAdminUpsertProject_(action, payload, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่จัดการโครงการได้',
      action,
    );
  }

  var projInput = payload.project || {};
  var rawCode = projInput.projectCode
    ? String(projInput.projectCode).trim().toUpperCase()
    : '';
  if (!rawCode) {
    return makeError_(
      'BAD_REQUEST',
      'กรุณาระบุรหัสโครงการ (projectCode)',
      action,
    );
  }

  var sheet = getSheet_(SHEET_NAMES.PROJECTS);
  var rows = readSheetObjects_(sheet, HEADERS.Projects);
  var existingEntry = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].obj.projectCode).toUpperCase() === rawCode) {
      existingEntry = rows[i];
      break;
    }
  }

  var prev = existingEntry ? existingEntry.obj : null;
  var nextStatus = projInput.status || (prev && prev.status) || 'กำลังก่อสร้าง';
  var isTransitioningToReady =
    nextStatus === 'Ready to move' && (!prev || prev.status !== 'Ready to move');

  var saved = {
    projectCode: rawCode,
    projectName: projInput.projectName || (prev && prev.projectName) || rawCode,
    status: nextStatus,
    sinkingRatePerSqm:
      projInput.sinkingRatePerSqm !== undefined
        ? projInput.sinkingRatePerSqm
        : prev
        ? prev.sinkingRatePerSqm
        : '',
    commonFeeRatePerSqmMonth:
      projInput.commonFeeRatePerSqmMonth !== undefined
        ? projInput.commonFeeRatePerSqmMonth
        : prev
        ? prev.commonFeeRatePerSqmMonth
        : '',
    transferFeePct:
      projInput.transferFeePct !== undefined
        ? projInput.transferFeePct
        : prev
        ? prev.transferFeePct
        : DEFAULT_CONFIG.transferFeePct,
    kFactor:
      projInput.kFactor !== undefined
        ? projInput.kFactor
        : prev
        ? prev.kFactor
        : DEFAULT_CONFIG.kFactor,
    vatPct:
      projInput.vatPct !== undefined
        ? projInput.vatPct
        : prev
        ? prev.vatPct
        : DEFAULT_CONFIG.vatPct,
    defaultVariance:
      projInput.defaultVariance !== undefined
        ? projInput.defaultVariance
        : prev
        ? prev.defaultVariance
        : DEFAULT_CONFIG.defaultVariance,
    priceRoundStep:
      projInput.priceRoundStep !== undefined
        ? projInput.priceRoundStep
        : prev
        ? prev.priceRoundStep
        : DEFAULT_CONFIG.priceRoundStep,
    comStepPct:
      projInput.comStepPct !== undefined
        ? projInput.comStepPct
        : prev
        ? prev.comStepPct
        : DEFAULT_CONFIG.comStepPct,
    sinkingRateDisplay:
      projInput.sinkingRateDisplay !== undefined
        ? projInput.sinkingRateDisplay
        : prev
        ? prev.sinkingRateDisplay
        : '',
    commonFeeRateDisplay:
      projInput.commonFeeRateDisplay !== undefined
        ? projInput.commonFeeRateDisplay
        : prev
        ? prev.commonFeeRateDisplay
        : '',
    specialRules:
      projInput.specialRules !== undefined
        ? projInput.specialRules
        : prev
        ? prev.specialRules
        : '',
    unitCount:
      projInput.unitCount !== undefined
        ? projInput.unitCount
        : prev
        ? prev.unitCount
        : 0,
    priceVersion:
      projInput.priceVersion !== undefined
        ? projInput.priceVersion
        : prev
        ? prev.priceVersion
        : 0,
    active:
      projInput.active !== undefined
        ? projInput.active
        : prev
        ? prev.active !== false
        : true,
    updatedAt: new Date().toISOString(),
  };

  if (existingEntry) {
    sheet
      .getRange(existingEntry.rowIndex, 1, 1, HEADERS.Projects.length)
      .setValues([objectToRow_(HEADERS.Projects, saved)]);
  } else {
    sheet.appendRow(objectToRow_(HEADERS.Projects, saved));
  }

  var data = {
    project: saved,
    readyToMoveWarning: isTransitioningToReady,
  };
  if (isTransitioningToReady) {
    data.warningMessage = READY_TO_MOVE_WARNING_MESSAGE;
  }

  return { ok: true, action: action, data: data };
}

function handleAdminPublishUnits_(action, payload, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่เผยแพร่ใบราคาได้',
      action,
    );
  }

  var incomingUnits = payload.units || [];
  if (incomingUnits.length === 0) {
    return makeError_('BAD_REQUEST', 'ไม่มีรายการห้องสำหรับเผยแพร่', action);
  }

  var now = new Date().toISOString();
  var unitsSheet = getSheet_(SHEET_NAMES.UNITS);
  var existingRows = readSheetObjects_(unitsSheet, HEADERS.Units);

  var grouped = {};
  incomingUnits.forEach(function (u) {
    var pCode = String(payload.targetProjectCode || u.projectCode)
      .trim()
      .toUpperCase();
    if (!grouped[pCode]) grouped[pCode] = [];
    grouped[pCode].push(u);
  });

  var targetCodes = Object.keys(grouped);
  var versions = {};
  var updatedProjects = [];

  // Mark old active rows as inactive in sheet in a single batch write
  var isActiveColIdx = HEADERS.Units.indexOf('isActiveVersion') + 1;
  if (existingRows.length > 0) {
    var activeFlags = existingRows.map(function (entry) {
      var rowProj = String(entry.obj.projectCode || '').trim().toUpperCase();
      var currentlyActive =
        entry.obj.isActiveVersion === undefined
          ? true
          : entry.obj.isActiveVersion === true ||
            entry.obj.isActiveVersion === 'TRUE';
      if (grouped[rowProj] && currentlyActive) {
        return [false];
      }
      return [currentlyActive];
    });
    unitsSheet
      .getRange(2, isActiveColIdx, activeFlags.length, 1)
      .setValues(activeFlags);
  }

  var rowsToAppend = [];

  targetCodes.forEach(function (pCode) {
    var prevProject = findProject_(pCode);
    var nextVersion = (prevProject ? Number(prevProject.priceVersion || 0) : 0) + 1;
    versions[pCode] = nextVersion;

    var projectUnits = grouped[pCode];
    var sinkingSet = {};
    var commonSet = {};

    projectUnits.forEach(function (u) {
      if (u.sinkingRatePerSqm && Number(u.sinkingRatePerSqm) > 0) {
        sinkingSet[Number(u.sinkingRatePerSqm)] = true;
      }
      if (
        u.commonFeeRatePerSqmMonth &&
        Number(u.commonFeeRatePerSqmMonth) > 0
      ) {
        commonSet[Number(u.commonFeeRatePerSqmMonth)] = true;
      }

      var unitCode = String(u.unitCode).trim();
      var rowObj = cloneObj_(u);
      rowObj.id = pCode + ':' + unitCode;
      rowObj.projectCode = pCode;
      rowObj.unitCode = unitCode;
      rowObj.combineCode = u.combineCode || pCode + unitCode;
      rowObj.priceVersion = nextVersion;
      rowObj.isActiveVersion = true;
      rowObj.publishedAt = now;
      rowObj.publishedBy = caller.email;

      rowsToAppend.push(objectToRow_(HEADERS.Units, rowObj));
    });

    var sortedU = Object.keys(sinkingSet)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var sortedW = Object.keys(commonSet)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });

    var upsertRes = handleAdminUpsertProject_(
      'admin.upsertProject',
      {
        project: {
          projectCode: pCode,
          unitCount: projectUnits.length,
          priceVersion: nextVersion,
          sinkingRatePerSqm: sortedU[0],
          commonFeeRatePerSqmMonth: sortedW[0],
          sinkingRateDisplay: formatRatesDisplayGas_(sortedU),
          commonFeeRateDisplay: formatRatesDisplayGas_(sortedW),
          active: true,
        },
      },
      caller,
    );
    if (upsertRes.ok) {
      updatedProjects.push(upsertRes.data.project);
    }
  });

  if (rowsToAppend.length > 0) {
    var startRow = unitsSheet.getLastRow() + 1;
    unitsSheet
      .getRange(startRow, 1, rowsToAppend.length, HEADERS.Units.length)
      .setValues(rowsToAppend);
  }

  return {
    ok: true,
    action: action,
    data: {
      projects: updatedProjects,
      publishedCount: incomingUnits.length,
      versions: versions,
    },
  };
}

function handleAdminGetProjectVersions_(action, payload, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่ดูประวัติเวอร์ชันราคาได้',
      action,
    );
  }
  if (!payload.projectCode) {
    return makeError_('BAD_REQUEST', 'กรุณาระบุ projectCode', action);
  }
  var pCode = String(payload.projectCode).trim().toUpperCase();
  var project = findProject_(pCode);
  var allUnits = readUnits_().filter(function (u) {
    return u.projectCode === pCode;
  });

  if (!project && allUnits.length === 0) {
    return makeError_('NOT_FOUND', 'ไม่พบข้อมูลโครงการ ' + pCode, action);
  }

  var versionMap = {};
  allUnits.forEach(function (u) {
    var v = Number(u.priceVersion || 1);
    if (!versionMap[v]) {
      versionMap[v] = {
        version: v,
        publishedAt: u.publishedAt || (project && project.updatedAt) || '',
        publishedBy: u.publishedBy || 'bddhteam@gmail.com',
        unitCount: 0,
      };
    }
    versionMap[v].unitCount++;
  });

  var versions = Object.keys(versionMap)
    .map(function (v) {
      return versionMap[v];
    })
    .sort(function (a, b) {
      return b.version - a.version;
    });

  var selectedVersion =
    payload.version !== undefined
      ? Number(payload.version)
      : project && project.priceVersion
      ? Number(project.priceVersion)
      : versions[0]
      ? versions[0].version
      : 1;

  var selectedUnits = allUnits.filter(function (u) {
    return Number(u.priceVersion || 1) === selectedVersion;
  });

  return {
    ok: true,
    action: action,
    data: {
      projectCode: pCode,
      versions: versions,
      selectedVersion: selectedVersion,
      units: selectedUnits,
    },
  };
}

function handleAdminUsersList_(action, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่ดูรายชื่อผู้ใช้งานได้',
      action,
    );
  }
  return {
    ok: true,
    action: action,
    data: { users: readUsers_() },
  };
}

function handleAdminUsersUpsert_(action, payload, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่จัดการผู้ใช้งานได้',
      action,
    );
  }

  var userIn = payload.user || {};
  var email = userIn.email ? String(userIn.email).trim().toLowerCase() : '';
  if (!email || !userIn.name || !userIn.role) {
    return makeError_(
      'BAD_REQUEST',
      'กรุณาระบุ email, name และ role ให้ครบถ้วน',
      action,
    );
  }

  var sheet = getSheet_(SHEET_NAMES.USERS);
  var rows = readSheetObjects_(sheet, HEADERS.Users);
  var existingEntry = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].obj.email).trim().toLowerCase() === email) {
      existingEntry = rows[i];
      break;
    }
  }

  var nextActive = userIn.active !== undefined ? Boolean(userIn.active) : true;
  if (
    existingEntry &&
    existingEntry.obj.role === 'admin' &&
    existingEntry.obj.active &&
    (userIn.role !== 'admin' || !nextActive) &&
    countOtherActiveAdminsGas_(rows, email) === 0
  ) {
    return makeError_(
      'CANNOT_REMOVE_LAST_ADMIN',
      'ไม่สามารถปิดสิทธิ์หรือลดบทบาท Admin คนสุดท้ายของระบบได้',
      action,
    );
  }

  var saved = {
    email: email,
    name: String(userIn.name).trim(),
    role: userIn.role,
    active: nextActive,
    createdAt:
      (existingEntry && existingEntry.obj.createdAt) ||
      new Date().toISOString(),
  };

  if (existingEntry) {
    sheet
      .getRange(existingEntry.rowIndex, 1, 1, HEADERS.Users.length)
      .setValues([objectToRow_(HEADERS.Users, saved)]);
  } else {
    sheet.appendRow(objectToRow_(HEADERS.Users, saved));
  }

  return { ok: true, action: action, data: { user: saved } };
}

function handleAdminUsersDelete_(action, payload, caller) {
  if (caller.role !== 'admin') {
    return makeError_(
      'FORBIDDEN',
      'เฉพาะ Admin เท่านั้นที่ลบผู้ใช้งานได้',
      action,
    );
  }
  var targetEmail = payload.email
    ? String(payload.email).trim().toLowerCase()
    : '';
  if (!targetEmail) {
    return makeError_('BAD_REQUEST', 'กรุณาระบุ email ที่ต้องการลบ', action);
  }

  var sheet = getSheet_(SHEET_NAMES.USERS);
  var rows = readSheetObjects_(sheet, HEADERS.Users);
  var targetEntry = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].obj.email).trim().toLowerCase() === targetEmail) {
      targetEntry = rows[i];
      break;
    }
  }

  if (!targetEntry) {
    return makeError_('NOT_FOUND', 'ไม่พบบัญชี ' + targetEmail, action);
  }

  if (
    targetEntry.obj.role === 'admin' &&
    targetEntry.obj.active &&
    countOtherActiveAdminsGas_(rows, targetEmail) === 0
  ) {
    return makeError_(
      'CANNOT_REMOVE_LAST_ADMIN',
      'ไม่สามารถลบ Admin คนสุดท้ายของระบบได้',
      action,
    );
  }

  sheet.deleteRow(targetEntry.rowIndex);
  return {
    ok: true,
    action: action,
    data: { deletedEmail: targetEmail },
  };
}

// -----------------------------------------------------------------------------
// Sheet & Utility Helpers
// -----------------------------------------------------------------------------

function getSpreadsheet_() {
  var sheetId =
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') ||
    DEFAULT_SPREADSHEET_ID;
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function readSheetObjects_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var results = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var val = row[c];
      obj[headers[c]] = val === '' ? undefined : val;
    }
    results.push({ rowIndex: r + 2, obj: obj });
  }
  return results;
}

function objectToRow_(headers, obj) {
  return headers.map(function (h) {
    var val = obj[h];
    if (val === undefined || val === null) return '';
    return val;
  });
}

function readProjects_() {
  return readSheetObjects_(getSheet_(SHEET_NAMES.PROJECTS), HEADERS.Projects).map(
    function (entry) {
      var p = entry.obj;
      p.projectCode = String(p.projectCode || '').trim().toUpperCase();
      p.active = p.active === undefined ? true : p.active === true || p.active === 'TRUE';
      p.priceVersion =
        p.priceVersion === undefined ? 1 : Number(p.priceVersion);
      p.unitCount = p.unitCount === undefined ? 0 : Number(p.unitCount);
      return p;
    },
  );
}

function readUnits_() {
  return readSheetObjects_(getSheet_(SHEET_NAMES.UNITS), HEADERS.Units).map(
    function (entry) {
      var u = entry.obj;
      u.projectCode = String(u.projectCode || '').trim().toUpperCase();
      u.unitCode = String(u.unitCode || '').trim();
      u.sgp = u.sgp === undefined ? null : Number(u.sgp);
      u.totalCostExpense =
        u.totalCostExpense === undefined ? null : Number(u.totalCostExpense);
      u.sgpCost = u.sgpCost === undefined ? null : Number(u.sgpCost);
      u.scPrice = u.scPrice === undefined ? null : Number(u.scPrice);
      u.agentNetPrice =
        u.agentNetPrice === undefined ? null : Number(u.agentNetPrice);
      u.commonFee1Y = Number(u.commonFee1Y || 0);
      u.isBlocked = u.isBlocked === true || u.isBlocked === 'TRUE';
      u.isActiveVersion =
        u.isActiveVersion === undefined
          ? true
          : u.isActiveVersion === true || u.isActiveVersion === 'TRUE';
      u.priceVersion = Number(u.priceVersion || 1);
      return u;
    },
  );
}

function readUsers_() {
  return readSheetObjects_(getSheet_(SHEET_NAMES.USERS), HEADERS.Users).map(
    function (entry) {
      var u = entry.obj;
      u.email = String(u.email || '').trim().toLowerCase();
      u.active = u.active === undefined ? true : u.active === true || u.active === 'TRUE';
      return u;
    },
  );
}

function readDeals_() {
  return readSheetObjects_(getSheet_(SHEET_NAMES.LOG), HEADERS.Log).map(
    function (entry) {
      var d = entry.obj;
      d.sellingPrice = Number(d.sellingPrice || 0);
      d.commissionPct = Number(d.commissionPct || 0);
      d.freeCommonYears = Number(d.freeCommonYears || 0);
      d.extraPromo = Number(d.extraPromo || 0);
      d.varianceThreshold = Number(d.varianceThreshold || 50000);
      d.remainingVariance = Number(d.remainingVariance || 0);
      return d;
    },
  );
}

function findProject_(projectCode) {
  var projects = readProjects_();
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].projectCode === projectCode) return projects[i];
  }
  return null;
}

function findActiveUnit_(projectCode, unitCode) {
  var units = readUnits_();
  for (var i = 0; i < units.length; i++) {
    if (
      units[i].isActiveVersion !== false &&
      units[i].projectCode === projectCode &&
      units[i].unitCode.toUpperCase() === unitCode
    ) {
      return units[i];
    }
  }
  return null;
}

function applyProjectSpecialRules_(unit, project) {
  if (!project.specialRules || !String(project.specialRules).trim()) {
    return unit;
  }
  var rules = String(project.specialRules).toLowerCase();
  if (rules.indexOf('ห้าม') === -1 && rules.indexOf('block') === -1) {
    return unit;
  }
  var escaped = unit.unitCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('(^|[^a-z0-9])' + escaped.toLowerCase() + '([^a-z0-9]|$)', 'i');
  if (re.test(String(project.specialRules))) {
    var copy = cloneObj_(unit);
    copy.isBlocked = true;
    copy.blockReason = project.specialRules;
    return copy;
  }
  return unit;
}

function countOtherActiveAdminsGas_(rows, excludeEmail) {
  var count = 0;
  for (var i = 0; i < rows.length; i++) {
    var u = rows[i].obj;
    var email = String(u.email || '').trim().toLowerCase();
    var isActive = u.active === true || u.active === 'TRUE';
    if (email !== excludeEmail && u.role === 'admin' && isActive) {
      count++;
    }
  }
  return count;
}

function formatRatesDisplayGas_(sorted) {
  if (!sorted || sorted.length === 0) return '';
  if (sorted.length === 1) return String(sorted[0]);
  return sorted[0] + '\u2013' + sorted[sorted.length - 1];
}

function cloneObj_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeError_(errorCode, errorMessage, action) {
  var err = {
    ok: false,
    errorCode: errorCode,
    errorMessage: errorMessage,
  };
  if (action !== undefined) {
    err.action = action;
  }
  return err;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
