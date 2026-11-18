<!-- PLAN-RELAY:EXECUTE -->

# PHASE 2 PLAN — Google Apps Script Backend, Local Dev Sandbox API & Role Security

## 1. CONTEXT
With Phase 0 (`calcEngine.ts`) and Phase 1 (`priceListImporter.ts`) complete and verified against the real 3,714-unit Excel workbook, Phase 2 builds the backend layer:
1. **Shared Server Core (`src/server/apiService.ts` + `src/server/seedStore.ts`)**: Implements the complete 4-sheet business logic (`Projects`, `Units`, `Users`, `Log`), strict role-based access control (`admin` vs `sales`), server-side calculation, unit price versioning (`v1`, `v2`, ... with historical version lookup), deal logging & approval workflow, and Ready-to-move status transition warnings.
2. **Vite Dev Server API Middleware (`vite.config.ts`)**: Mounts `POST /api` (and `GET /api/health`) directly inside Vite's dev/preview server, pre-seeded automatically from `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` (all 7 projects, 3,714 units, default project status `'กำลังก่อสร้าง'`, initial `Users` including `bddhteam@gmail.com` as `admin`, `nat@scasset.com` as `admin`, and `sales@scasset.com` as `sales`, plus realistic initial `Log` deals matching Mockup 04).
3. **Google Apps Script Production Code (`gas/Code.gs` & `gas/appsscript.json`)**: Complete standalone Google Apps Script implementation for the 4 Google Sheets (`Projects`, `Units`, `Users`, `Log`), Google `id_token` verification (`oauth2.googleapis.com/tokeninfo`), `POST` `text/plain` CORS-safe handler, and exact parity with the calculation engine and role security rules.

## 2. GOAL
Deliver a fully tested backend service, Vite `/api` middleware, and Google Apps Script (`gas/Code.gs`) that strictly enforce the secret `M` (`sgp`) and `O` (`sgpCost`) protection rule for `sales` users while supporting all Admin and Sales workflows.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - Update `src/shared/priceListImporter.ts` line 427 so default project `status` when not specified in `projectStatusMap` is `'กำลังก่อสร้าง'` (per Khun Bank's approved decision `A3`).
  - `src/shared/types.ts`: Add API request/response contracts (`ApiAction`, `ApiRequest`, `ApiResponse`, `PriceVersionSummary`, etc.) and `active?: boolean` on `ProjectConfig`.
  - `src/server/apiService.ts`: Pure stateful 4-sheet backend service (`Projects`, `Units`, `Users`, `Log`) with `toSalesUnitRecord(unit)` sanitizer that strips `sgp` (M), `totalCostExpense` (N), and `sgpCost` (O) from every `sales` unit response.
  - `src/server/seedStore.ts`: Loads `For_Price_Negotiation_Dashboard_revised.xlsx` once to seed the 7 projects (3,714 units, `priceVersion: 1`, `isActiveVersion: true`, `status: 'กำลังก่อสร้าง'`), initial `Users` (`bddhteam@gmail.com` admin, `nat@scasset.com` admin, `sales@scasset.com` sales), and sample `Log` entries matching Mockup 04 (`CORM9 B0407` at 15:02 pending `9,837`, 14:48 pass `58,718`, 14:31 fail `-39,044`, and `CORM9 E0408` at 11:05 pass `315,391`).
  - `vite.config.ts`: Add a custom Vite plugin (`scApiMiddlewarePlugin`) serving `POST /api` on both `configureServer` (dev) and `configurePreviewServer` (preview) so a single `npm.cmd run dev` or `npm.cmd run preview` serves both the PWA and `/api`.
  - `gas/Code.gs` and `gas/appsscript.json`: Complete Google Apps Script backend for `bddhteam@gmail.com` with 4-sheet initialization (`setupSheets`), Google OAuth `id_token` verification, role lookup from `Users` sheet, `toSalesUnitRecord` stripping `M, N, O`, exact calculation formulas (`calculateDealGas`), versioned unit publishing, project status warning, and deal approval endpoints.
  - `src/shared/__tests__/apiService.test.ts`: Comprehensive integration & security tests verifying all AC items.
- **OUT OF SCOPE**:
  - Full 9-screen React UI implementation (Phase 3)
  - Creating real Google Sheet / deploying Apps Script to `bddhteam@gmail.com` (Phase 5 — gated on user approval).

## 4. TASKS
1. **Default Project Status Fix in `src/shared/priceListImporter.ts`**:
   - Change the fallback project status in `parsePriceListWorkbook` from `'Ready to move'` to `'กำลังก่อสร้าง'`.
2. **Extend API Contracts in `src/shared/types.ts`**:
   - Add `active?: boolean` to `ProjectConfig`.
   - Define `PriceVersionSummary` (`version: number`, `publishedAt: string`, `publishedBy: string`, `unitCount: number`).
   - Define typed API actions and payloads for:
     - `auth.me`
     - `catalog.bootstrap`
     - `units.search` (`projectCode?`, `query?`, `limit?`)
     - `units.get` (`projectCode`, `unitCode`)
     - `calc.compute` (`projectCode`, `unitCode`, `mode`, `commissionPct?`, `sellingPrice?`, `freeCommonYears?`, `extraPromo?`, `variance?`)
     - `deals.list` (`filter?: 'all' | 'pending' | 'mine'`)
     - `deals.create`
     - `deals.requestApproval` (`dealId`)
     - `deals.review` (`dealId`, `decision: 'approved' | 'rejected'`, `note?`)
     - `admin.upsertProject`
     - `admin.publishUnits`
     - `admin.getProjectVersions` (`projectCode`, `version?`)
     - `admin.users.list` / `admin.users.upsert` / `admin.users.delete`
3. **Implement `src/server/apiService.ts` & `src/server/seedStore.ts`**:
   - Implement `toSalesUnitRecord(unit: UnitRecord): SalesUnitRecord` that creates a shallow copy and explicitly deletes `sgp`, `totalCostExpense`, and `sgpCost` (and verifies `'sgp' in result === false && 'sgpCost' in result === false && 'totalCostExpense' in result === false`).
   - Ensure `catalog.bootstrap`, `units.search`, and `units.get` NEVER return `sgp`, `totalCostExpense`, or `sgpCost` when `caller.role === 'sales'`.
   - Ensure `admin` callers receive full `UnitRecord` (including `sgp` and `sgpCost`) on `units.get` and `admin.getProjectVersions`.
   - Ensure `calc.compute` looks up the active `UnitRecord` on the server, applies any project `specialRules` / `isBlocked` guard, runs `calculateDeal`, and returns the `CalcResult`.
   - Ensure `admin.upsertProject` returns `readyToMoveWarning: true` and message `"เมื่อเปลี่ยนสถานะเป็น Ready to move ต้องอัปเดตต้นทุนในช่อง O ให้รวมฟรีส่วนกลางปีแรกด้วย"` whenever a project's status transitions to `'Ready to move'` (or is created with `'Ready to move'`).
   - Ensure `admin.publishUnits` increments `priceVersion` for the target project(s), sets `isActiveVersion = false` on prior versions of those projects in the `Units` store (keeping them queryable via `admin.getProjectVersions`), inserts the new version rows with `isActiveVersion = true`, and updates the project's `unitCount`, `priceVersion`, `sinkingRateDisplay`, and `commonFeeRateDisplay`.
   - Ensure new projects added via `admin.upsertProject` (even before or after importing units) appear immediately in `catalog.bootstrap` without code changes.
4. **Mount `/api` Middleware in `vite.config.ts`**:
   - Add a Vite plugin that intercepts `POST /api` (parsing JSON from either `text/plain` or `application/json` request bodies) and delegates to the singleton seeded `ApiService` instance.
5. **Create Google Apps Script Backend (`gas/Code.gs` and `gas/appsscript.json`)**:
   - Write clean, well-structured Apps Script code implementing the 4 sheets (`Projects`, `Units`, `Users`, `Log`), `doPost(e)`, `verifyGoogleIdToken(idToken)`, role check against `Users`, `toSalesUnitRecord`, `calculateDealGas` (matching `src/shared/calcEngine.ts` formulas identically), versioned `Units` publishing, and `Log` deal creation/approval.
6. **Write Integration & Security Tests (`src/shared/__tests__/apiService.test.ts`)**:
   - Verify seeded store has 7 projects (`status: 'กำลังก่อสร้าง'`) and 3,714 active units.
   - **Security Test**: Call `catalog.bootstrap`, `units.search`, and `units.get` (`CORM9 B0407`) as `sales@scasset.com` (`role: 'sales'`), serialize the responses to JSON, and assert that `'sgp'`, `'sgpCost'`, `'totalCostExpense'`, `'2326000'`, and `'2368887'` do **NOT** appear anywhere in the serialized JSON!
   - Verify `units.get` (`CORM9 B0407`) as `bddhteam@gmail.com` (`role: 'admin'`) DOES include `sgp: 2326000` and `sgpCost: 2368887.046`.
   - Verify `sales` attempting `admin.upsertProject`, `admin.publishUnits`, `admin.users.upsert`, or `deals.review` is rejected with `FORBIDDEN`.
   - Verify `admin` adding a new project (`TEST01`) dynamically via `admin.upsertProject` makes `TEST01` appear in `catalog.bootstrap` immediately (`8` projects total).
   - Verify changing project status from `'กำลังก่อสร้าง'` to `'Ready to move'` returns `readyToMoveWarning: true`.
   - Verify `admin.publishUnits` for a project increments `priceVersion` from `1` to `2` while keeping `v1` accessible via `admin.getProjectVersions`.
   - Verify `deals.create`, `deals.requestApproval`, `deals.list` (`all`, `pending`, `mine`), and `deals.review` (`approved` / `rejected`).
   - Verify `admin.users.list`, `admin.users.upsert` (adding P'Nat's email as `admin`), and preventing deletion of the last active admin.

## 5. CONSTRAINTS
- Do NOT break any Phase 0 or Phase 1 tests.
- Never leak `M` (`sgp`), `N` (`totalCostExpense`), or `O` (`sgpCost`) in `sales` unit endpoints.
- Do NOT run `git commit`, `git push`, `clasp`, or deploy commands.

## 6. ACCEPTANCE CRITERIA
- **AC-2.1**: `npm.cmd test` passes 100% of Phase 0, Phase 1, and Phase 2 tests (`calcEngine.test.ts`, `priceListImporter.test.ts`, `apiService.test.ts`).
- **AC-2.2**: Security assertion passes: `sales` responses for `catalog.bootstrap`, `units.search`, and `units.get` contain zero `sgp`, `totalCostExpense`, or `sgpCost` fields or values.
- **AC-2.3**: Dynamic project creation (`admin.upsertProject`), Ready-to-move status warning, price versioning (`v1` -> `v2` with `v1` history preserved), deal approval workflow, and user management all pass automated tests.
- **AC-2.4**: `gas/Code.gs` and `gas/appsscript.json` exist and implement the 4-sheet schema (`Projects`, `Units`, `Users`, `Log`) and identical calculation/security logic.
- **AC-2.5**: `npm.cmd run build` exits with code 0 and zero TypeScript errors.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-2-OUTPUT.md`.
