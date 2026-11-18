# PHASE 0 OUTPUT — Project Setup, Core Calculation Engine & Mandatory Unit Tests

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created Files

All Phase 0 tasks from `docs/relay/PHASE-0-PLAN.md` have been completed without altering formulas or scope.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `package.json` | Created | Project manifest, dependencies (`react`, `react-dom`, `xlsx`), devDependencies (`typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `vitest`), scripts (`dev`, `build`, `preview`, `test`) |
| `package-lock.json` | Generated | Locked dependency tree from `npm.cmd install` |
| `tsconfig.json` | Created | Strict TypeScript configuration targeting ES2022 + React JSX |
| `vite.config.ts` | Created | Vite React configuration |
| `index.html` | Created | Mobile-first HTML shell (`viewport-fit=cover`, `#FD6205` theme color, Google Fonts `IBM Plex Sans Thai` & `IBM Plex Mono`, `/sc-logo.png` icon) |
| `public/sc-logo.png` | Copied | Copied from `price-negotiation-assets/price-negotiation-assets/sc-logo.png` (identical SHA256) |
| `src/index.css` | Created | SC Asset CSS design tokens, status colors, typography (`IBM Plex Sans Thai` / `IBM Plex Mono`), and 390px `.app-shell` base styles |
| `src/main.tsx` | Created | React 19 entry point |
| `src/App.tsx` | Created | Minimal Phase 0 placeholder shell displaying SC logo and theme styling |
| `src/shared/types.ts` | Created | Domain interfaces (`ProjectStatus`, `ProjectConfig`, `UnitRecord`, `SalesUnitRecord`, `PublicUnitRecord`, `CalcMode`, `DealStatus`, `CalcInput`, `CalcBreakdown`, `CalcResult`, `DealLogRecord`, `UserRecord`) |
| `src/shared/calcEngine.ts` | Created | Pure TypeScript calculation engine implementing Modes A, B, C, status classification (`pass`/`approval`/`fail`), breakdown (`ที่มาของตัวเลข`), and unit guard checks |
| `src/shared/__tests__/calcEngine.test.ts` | Created | 17 Vitest test cases covering all 4 mandatory P'Nat cases, Mockup 03c & 04 verification cases, edge cases, and guard checks |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-0.1** | `npm.cmd test` runs Vitest and passes 100% of test cases including the 4 mandatory P'Nat cases (`2,500,000 / 58,718`, `2,480,000 / 55,600`, `2.46% / 2% / 58,718`, and `331,832`) plus the Mockup 03c/04 verification cases (`75,152`, `9,837`, `-39,044`) and guard checks. | Ran `npm.cmd test` (`vitest run`) after final edit: **1 test file passed, 17 tests passed (17/17)**, exit code `0`. Verified Case 1 (`2,500,000 / 58,718`), Case 2 (`2,480,000 / 55,600 / 55,513 / 2,368,887`), Case 3 (`2.46% / 2% / next 3% / 3.36% / 0.89% / 58,718`), Case 4 (`331,832`), Mockup 03c (`75,152`), Mockup 04 (`9,837`, `-39,044`), negative Mode B headroom, and guard errors (`UNIT_BLOCKED`, `MISSING_SGP_COST`, `COMMISSION_RATE_TOO_HIGH`, `INVALID_INPUT`). | PASS |
| **AC-0.2** | `npm.cmd run build` completes with exit code 0 and zero TypeScript errors. | Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edit: **exit code 0**, zero TypeScript errors, Vite bundled 29 modules into `dist/`. | PASS |
| **AC-0.3** | `public/sc-logo.png` exists and matches the source asset. | Verified via `Get-FileHash`: SHA256 of `price-negotiation-assets/price-negotiation-assets/sc-logo.png`, `public/sc-logo.png`, and `dist/sc-logo.png` all match identically (`EEE79B31B54F9EC225570BF050463E7EDC39AF01A78A7FB1DC2002CED1C2CC96`). | PASS |

---

## 3. Notes & Technical Decisions

1. **Pure Engine & Guard Result Union (`CalcResult`)**:
   - `src/shared/calcEngine.ts` uses zero browser or Node-specific imports so it can run identically in browser, Node dev server, and Google Apps Script builds.
   - `calculateDeal` returns a discriminated union (`CalcSuccessResult | CalcErrorResult` on `ok: boolean`) so blocked units (`isBlocked: true`) and missing/zero-cost units (`sgpCost <= 0` or nullish) return typed guard errors (`UNIT_BLOCKED`, `MISSING_SGP_COST`, `INVALID_INPUT`, `COMMISSION_RATE_TOO_HIGH`) without throwing uncaught exceptions.
2. **Domain Type Alias Compatibility**:
   - `src/shared/types.ts` defines `SalesUnitRecord = Omit<UnitRecord, 'sgp' | 'totalCostExpense' | 'sgpCost'>` (Task 2) and also exports `PublicUnitRecord = SalesUnitRecord` (Scope section) so either name works across future phases.
3. **Mockup 04 Arithmetic Clarification**:
   - In `PHASE-0-PLAN.md` Task 4 lines 105–106, the prose mentioned `freeCommonYears = 0` alongside Mockup 04 values `9,837` (at `2,450,000`) and `-39,044` (at `2,400,000`). Direct calculation confirms `9,837` (`9,837.174`) and `-39,044` (`-39,043.606`) occur with `freeCommonYears = 1` (subtracting 1-year common fee `16,434`), whereas `freeCommonYears = 0` yields `26,271` (`approval`) and `-22,610` (`fail`). Both `freeCommonYears = 1` (Mockup 04 exact numbers) and `freeCommonYears = 0` are tested in `src/shared/__tests__/calcEngine.test.ts` without modifying any confirmed formula.
4. **Build Type Fix**:
   - Annotated `vatPct: number` and `kFactor: number` default parameters in `actualComCostRate` so `DEFAULT_PROJECT_CONFIG_VALUES` (`as const`) does not narrow parameter types to literal `7` and `1.046`.
