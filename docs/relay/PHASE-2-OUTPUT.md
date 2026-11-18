# PHASE 2 OUTPUT — Google Apps Script Backend, Local Dev Sandbox API & Role Security

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created / Modified Files

All Phase 2 tasks from `docs/relay/PHASE-2-PLAN.md` have been completed, keeping all Phase 0 and Phase 1 tests passing with zero regressions.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `src/shared/priceListImporter.ts` | Modified | Updated fallback project status in `parsePriceListWorkbook` from `'Ready to move'` to `'กำลังก่อสร้าง'` per decision `A3` |
| `src/shared/types.ts` | Modified | Added `active?: boolean` on `ProjectConfig`, `PriceVersionSummary`, `ApiAction`, `ApiErrorCode`, `ApiRequest`, `ApiResponse`, and typed request/response contracts for all 15 API endpoints |
| `src/server/apiService.ts` | Created | Pure stateful 4-sheet backend (`Projects`, `Units`, `Users`, `Log`) with `toSalesUnitRecord` invariant sanitizer, strict server-side role resolution & RBAC (`admin`/`approver`/`sales`), server-side `calculateDeal`, `Ready to move` status transition warning, versioned `admin.publishUnits`, `admin.getProjectVersions`, `deals.*` workflow, and last-admin protection |
| `src/server/seedStore.ts` | Created | Parses `For_Price_Negotiation_Dashboard_revised.xlsx` once into cached seed data (7 projects at status `'กำลังก่อสร้าง'`, `priceVersion: 1`, 3,714 active units), seeds initial users (`bddhteam@gmail.com` admin, `nat@scasset.com` admin, `sales@scasset.com` sales) and 4 Mockup 04 sample `Log` entries (`9,837`, `58,718`, `-39,044`, `315,391`) |
| `vite.config.ts` | Modified | Added `scApiMiddlewarePlugin` mounting `GET /api/health`, `OPTIONS /api`, and `POST /api` (supporting both `text/plain` and `application/json`) on both `configureServer` and `configurePreviewServer` |
| `gas/appsscript.json` | Created | Google Apps Script V8 manifest (`Asia/Bangkok`, `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`) |
| `gas/Code.gs` | Created | Standalone Google Apps Script backend implementing `setupSheets()`, 4-sheet schema (`Projects`, `Units`, `Users`, `Log`), `verifyGoogleIdToken`, role lookup from `Users`, `toSalesUnitRecord`, `calculateDealGas` (exact formula parity), batch versioned unit publishing, `LockService` write locking, and all 15 actions |
| `src/shared/__tests__/apiService.test.ts` | Created | 9 integration & security Vitest tests verifying seeding, strict `sales` zero-leak security, `admin` full cost access, `FORBIDDEN` RBAC enforcement, `calc.compute`, `TEST01` dynamic creation, `Ready to move` warning, `v1 -> v2` versioning, deal approval workflow, and last-admin protection |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-2.1** | `npm.cmd test` passes 100% of Phase 0, Phase 1, and Phase 2 tests (`calcEngine.test.ts`, `priceListImporter.test.ts`, `apiService.test.ts`). | Ran `npm.cmd test` (`vitest run`) after final edits: **3 test files passed, 35 tests passed (35/35)** (`calcEngine.test.ts` 17/17, `priceListImporter.test.ts` 9/9, `apiService.test.ts` 9/9), total duration `4.35s`, exit code `0`. | PASS |
| **AC-2.2** | Security assertion passes: `sales` responses for `catalog.bootstrap`, `units.search`, and `units.get` contain zero `sgp`, `totalCostExpense`, or `sgpCost` fields or values. | Verified in `apiService.test.ts`: serialized JSON across `catalog.bootstrap`, `units.search`, and `units.get` (`CORM9 B0407`) for `sales@scasset.com` contains zero occurrences of `'sgp'`, `'sgpCost'`, `'totalCostExpense'`, `'2326000'`, or `'2368887'`; `'sgp' in unit === false` on every returned unit and on `toSalesUnitRecord`. Also smoke-tested live Vite middleware `POST /api` (`units.get` as `sales@scasset.com`): `has sgp?: false`, `has sgpCost?: false`, `agentNetPrice: 3170000`. | PASS |
| **AC-2.3** | Dynamic project creation (`admin.upsertProject`), Ready-to-move status warning, price versioning (`v1` -> `v2` with `v1` history preserved), deal approval workflow, and user management all pass automated tests. | Verified in `apiService.test.ts`: `TEST01` appears immediately in `catalog.bootstrap` (8 projects); status transition to `'Ready to move'` returns `readyToMoveWarning: true` and exact Thai warning message; `admin.publishUnits` advances `RFS63` from `v1` (347 units) to `v2` (10 units) while `admin.getProjectVersions` retrieves `[2, 1]` and all 347 `v1` units; `deals.create` -> `deals.requestApproval` -> `deals.list` (`all`/`pending`/`mine`) -> `deals.review` passes; `admin.users.delete`/`upsert` guards against removing/demoting the last active admin (`CANNOT_REMOVE_LAST_ADMIN`). | PASS |
| **AC-2.4** | `gas/Code.gs` and `gas/appsscript.json` exist and implement the 4-sheet schema (`Projects`, `Units`, `Users`, `Log`) and identical calculation/security logic. | Created both files. Validated `gas/Code.gs` JavaScript syntax via Node `vm.Script` (`gas/Code.gs syntax OK`) and `gas/appsscript.json` JSON parsing (`appsscript.json valid`). Verified exact parity of `calculateDealGas`, `toSalesUnitRecord`, 4-sheet schema (`Projects`, `Units`, `Users`, `Log`), `verifyGoogleIdToken`, `LockService` write locking, and all 15 actions. | PASS |
| **AC-2.5** | `npm.cmd run build` exits with code 0 and zero TypeScript errors. | Ran `npm.cmd run build` (`tsc --noEmit && vite build`): **exit code 0**, zero TypeScript errors, 29 modules bundled into `dist/`. Also ran strict `tsc` check directly on `vite.config.ts`: exit code `0`, zero errors. | PASS |

---

## 3. Notes & Technical Decisions

1. **Lazy Singleton Middleware in `vite.config.ts`**:
   - `scApiMiddlewarePlugin` instantiates `createSeededApiService()` lazily on the first `/api` or `/api/health` request rather than at config load time, keeping `npm.cmd run build` fast and avoiding parsing the 3,714-row Excel file during static builds.
2. **GAS Batch Deactivation on `admin.publishUnits`**:
   - In `gas/Code.gs`, prior active rows in the `Units` sheet are marked `isActiveVersion = false` using a single batch `setValues` call across the `isActiveVersion` column instead of row-by-row `setValue` calls, preventing execution quota/timeout issues when republishing large projects like `CORM9` (1,500 units).
3. **Auth & Dev Sandbox Parity**:
   - `ApiService` supports `tokenVerifier` for real Google `id_token` verification and `devEmail` / `x-user-email` for local dev & tests (`allowDevAuth: true`), while ALWAYS resolving `role` server-side from the `Users` store (never trusting client-sent roles). In `gas/Code.gs`, `authenticateCaller_` strictly calls `verifyGoogleIdToken` via `oauth2.googleapis.com/tokeninfo` and looks up the active user in the `Users` sheet.
