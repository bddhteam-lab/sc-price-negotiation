# PHASE 4 OUTPUT — End-to-End Verification, Admin Cost Display Fix & Browser Readiness

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created / Modified Files

All Phase 4 tasks from `docs/relay/PHASE-4-PLAN.md` have been completed and verified.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `src/App.tsx` | Modified | Updated `<UnitCardScreen>` prop on line 307 from `showAdminCost={user.role === 'admin' && viewMode === 'admin'}` to `showAdminCost={user.role === 'admin'}` so Admin users always see SGP (`M`) and SGP+COST (`O`) even after navigating via Sales Home |
| `vite.config.ts` | Modified | Added `build.rollupOptions.output.manualChunks` separating `xlsx` (`xlsx-vendor`) and `react`/`react-dom` (`react-vendor`), eliminating Vite >500kB bundle chunk warnings |
| `src/shared/__tests__/e2eWorkflow.test.ts` | Created | End-to-end integration test covering real Excel import (7 projects / 3,714 units), all 4 mandatory P'Nat `calc.compute` cases, Sales zero-leak vs Admin SGP visibility, dynamic `TEST01` project addition, `v1 -> v2` price versioning with `v1` history retrieval, and blocked unit guards (`COLS SHOP1` + `ห้ามขาย` Decoration) |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-4.1** | `src/App.tsx` passes `showAdminCost={user.role === 'admin'}` to `UnitCardScreen`. | Verified in `src/App.tsx` line 307: `showAdminCost={user.role === 'admin'}`. | PASS |
| **AC-4.2** | `npm.cmd test` passes 100% of test suites (`calcEngine.test.ts`, `priceListImporter.test.ts`, `apiService.test.ts`, `e2eWorkflow.test.ts`). | Ran `npm.cmd test` (`vitest run`) after final edits: **4 test files passed, 36 tests passed (36/36)** (`calcEngine.test.ts` 17/17, `priceListImporter.test.ts` 9/9, `apiService.test.ts` 9/9, `e2eWorkflow.test.ts` 1/1), total `3.73s`, exit code `0`. | PASS |
| **AC-4.3** | `npm.cmd run build` exits with code 0, zero TypeScript errors, and zero chunk-size warnings. | Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edits: **exit code 0**, zero TypeScript errors, zero chunk-size warnings (`index` 77.63 kB, `react-vendor` 223.08 kB, `xlsx-vendor` 332.97 kB). Also ran strict `tsc` check directly on `vite.config.ts`: exit code `0`. | PASS |

---

## 3. Notes

- Normalized module path separators (`id.replace(/\\/g, '/')`) in `manualChunks` in `vite.config.ts` so chunk splitting works identically on Windows and POSIX runners.
- No `git commit`, `git push`, `clasp`, or deployment commands were executed.
