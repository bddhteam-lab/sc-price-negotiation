<!-- PLAN-RELAY:EXECUTE -->

# PHASE 4 PLAN — End-to-End Verification, Admin Cost Display Fix & Browser Readiness

## 1. CONTEXT
During the Phase 3 code review of `src/App.tsx`, the Reviewer found one bug on line 307:
- `showAdminCost={user.role === 'admin' && viewMode === 'admin'}`
- Because an Admin user navigates to `sales-home` (which sets `viewMode = 'sales'`) before clicking a unit to open `UnitCardScreen`, `viewMode` is `'sales'` when `UnitCardScreen` renders, causing `showAdminCost` to evaluate to `false` even when logged in as `admin`!
- Fixing this to `showAdminCost={user.role === 'admin'}` ensures Admin users see `SGP (ช่อง M)` and `SGP + ต้นทุนโปร (ช่อง O)` on the Unit Card (`02_unit_card.png`), while `sales` users (`user.role === 'sales'`) continue to see `🔒 ราคาขั้นต่ำ (SGP) — เห็นเฉพาะ Admin` and never receive `M` or `O` from the server.

In addition, we want to configure `vite.config.ts` build chunking (`manualChunks` for `xlsx`) so `npm.cmd run build` produces zero chunk-size warnings, and add an end-to-end API workflow test (`src/shared/__tests__/e2eWorkflow.test.ts`) verifying all completion criteria before launching the live Antigravity Browser verification.

## 2. GOAL
Fix `showAdminCost` for Admin in `src/App.tsx`, eliminate the Vite bundle chunk warning, verify all end-to-end workflows via Vitest, and prepare the built application for Antigravity Browser visual verification.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - `src/App.tsx`: Change `showAdminCost={user.role === 'admin' && viewMode === 'admin'}` to `showAdminCost={user.role === 'admin'}`.
  - `vite.config.ts`: Add `build.rollupOptions.output.manualChunks` separating `xlsx` into its own chunk so `npm.cmd run build` completes with zero warnings.
  - `src/shared/__tests__/e2eWorkflow.test.ts`: End-to-end test verifying:
    1. Full import of `For_Price_Negotiation_Dashboard_revised.xlsx` -> 7 projects, 3,714 units.
    2. All 4 mandatory P'Nat calculation test cases via `calc.compute` API endpoint.
    3. Sales login (`sales@scasset.com`) -> `catalog.bootstrap`, `units.search`, `units.get` contain zero `sgp` (M) or `sgpCost` (O) fields/values, while `admin` login (`bddhteam@gmail.com`) receives `sgp` and `sgpCost`.
    4. Admin adds a new test project (`TEST01`) dynamically without code changes -> `sales` immediately sees `TEST01` in `catalog.bootstrap`.
    5. Admin imports units for a project -> version increments (`v1 -> v2`) and old version (`v1`) remains viewable in `admin.getProjectVersions`.
    6. Blocked unit (`Decoration` `"ห้ามขาย"` and `COLS SHOP1`) refuses calculation.
- **OUT OF SCOPE**:
  - Production deployment (Phase 5 — gated on user approval after reviewing screenshots).

## 4. TASKS
1. **Fix `showAdminCost` in `src/App.tsx`**:
   - Update `<UnitCardScreen>` prop to `showAdminCost={user.role === 'admin'}`.
2. **Add `manualChunks` in `vite.config.ts`**:
   - Split `xlsx` into a separate vendor chunk so `vite build` has zero chunk-size warnings.
3. **Add `src/shared/__tests__/e2eWorkflow.test.ts`**:
   - Write and run the end-to-end workflow test suite.
4. **Run `npm.cmd test` and `npm.cmd run build`** and record results in `docs/relay/PHASE-4-OUTPUT.md`.

## 5. CONSTRAINTS
- Do NOT run `git commit`, `git push`, `clasp`, or `deploy`.

## 6. ACCEPTANCE CRITERIA
- **AC-4.1**: `src/App.tsx` passes `showAdminCost={user.role === 'admin'}` to `UnitCardScreen`.
- **AC-4.2**: `npm.cmd test` passes 100% of test suites (`calcEngine.test.ts`, `priceListImporter.test.ts`, `apiService.test.ts`, `e2eWorkflow.test.ts`).
- **AC-4.3**: `npm.cmd run build` exits with code 0, zero TypeScript errors, and zero chunk-size warnings.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-4-OUTPUT.md`.
