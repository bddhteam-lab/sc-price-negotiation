# PHASE 1 OUTPUT — Excel Importer (`PriceList` Parser, Validator & Clean Rules)

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created / Modified Files

All Phase 1 tasks from `docs/relay/PHASE-1-PLAN.md` have been completed while maintaining 100% backward compatibility with Phase 0 tests and calculation formulas.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `src/shared/types.ts` | Modified | Added `combineCode`, `decoration`, `unitSuffix`, `priceVersion`, `isActiveVersion` to `UnitRecord`, `sinkingRateDisplay` / `commonFeeRateDisplay` to `ProjectConfig`, and defined `ColumnMapping`, `DecorationSummaryItem`, `ImportValidationReport`, `ImportOptions`, `ImportResult` |
| `src/shared/priceListImporter.ts` | Created | Implemented `DEFAULT_COLUMN_MAPPING`, `isDefaultBlockedDecoration`, `getDefaultBlockedDecorations`, and `parsePriceListWorkbook` with 50-row consecutive empty `D+E` termination, single-project filter, whitespace trimming, computed `T/V/X`, decoration blocking, and project rate summaries |
| `src/shared/__tests__/priceListImporter.test.ts` | Created | 9 Vitest tests verifying the real `For_Price_Negotiation_Dashboard_revised.xlsx` workbook across all 7 projects / 3,714 units, cleaning rules, edge cases, and direct integration with `calculateDeal` |
| `package.json`, `package-lock.json` | Modified | Added `@types/node` as `devDependency` so `tsc --noEmit` cleanly type-checks Node `fs`/`path` imports in `priceListImporter.test.ts` |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-1.1** | `npm.cmd test` passes 100% of Phase 0 + Phase 1 tests, and the Excel import test completes in `< 5 seconds` (skipping the 343k blank trailing rows). | Ran `npm.cmd test` (`vitest run`) after final edit: **2 test files passed, 26 tests passed (26/26)** (`calcEngine.test.ts` 17/17 in `16ms`; `priceListImporter.test.ts` 9/9 in `2,975ms`, ~650–900ms per full workbook parse; total suite `4.06s`), exit code `0`. Confirmed `PriceList` stops scanning after 50 consecutive empty rows after row 3720 instead of iterating `!ref` (`A1:DY1047624`). | PASS |
| **AC-1.2** | Importing `For_Price_Negotiation_Dashboard_revised.xlsx` yields exactly 7 projects and 3,714 units (`COLS: 671, CORM9: 1500, COKS: 399, RFWY: 287, STS20: 123, RFKS: 387, RFS63: 347`). | Verified in `priceListImporter.test.ts`: `fullImport.projects.length === 7`, `fullImport.units.length === 3714`, exact unit counts `{ COLS: 671, CORM9: 1500, COKS: 399, RFWY: 287, STS20: 123, RFKS: 387, RFS63: 347 }`. | PASS |
| **AC-1.3** | All cleaning and validation rules pass: `STS20/RFKS/RFS63` (857 units) have computed `T, V, X`; `RFS63` (347 units) has trailing whitespace trimmed; `COLS SHOP1–2` and `CORM9 SH101–106` missing prices are properly handled; `Decoration` blocking works and integrates with `calculateDeal`. | Verified in `priceListImporter.test.ts`: `missingExpenseColsCount = 857` (all 857 units in `STS20/RFKS/RFS63` have computed `transferFee > 0`, `sinkingFund > 0`, `commonFee1Y > 0`); `RFS63` filter yields 347 units with `duplicateCount = 0`, `missingSgpCount = 0`, `trimmedRoomTypeCount = 347`, and zero trailing spaces; `COLS SHOP1–2` have `scPrice === null`, `agentNetPrice === null`, `unitStatus === 'ยังไม่มีราคา'`, `isBlocked === true`; `CORM9 SH101–106` have `scPrice === null` and `agentNetPrice > 0`; `COKS` summary has `commonFeeRateDisplay === '70–85'`; parsed `CORM9 B0407` and `E0408` reproduce all 4 Phase 0 `calculateDeal` results identically; default & custom `blockedDecorations` block units and return `UNIT_BLOCKED` from `calculateDeal`. | PASS |
| **AC-1.4** | `npm.cmd run build` exits with code 0 and zero TypeScript errors. | Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edit: **exit code 0**, zero TypeScript errors, 29 modules bundled into `dist/`. | PASS |

---

## 3. Notes & Technical Decisions

1. **Trailing Blank Rows & Fast SheetJS Parsing**:
   - The real `PriceList` sheet declares `!ref: A1:DY1047624` (over 1 million rows). `parsePriceListWorkbook` reads with `{ type: 'array', cellFormula: false, cellHTML: false, cellNF: false, cellStyles: false }` and walks rows from `startRow = 7`, terminating immediately once `50` consecutive rows have empty Project (`D`) and Unit Code (`E`) cells (stopping at row 3770 right after the last unit at row 3720).
2. **`@types/node` Dev Dependency**:
   - Added `@types/node` to `devDependencies` so `tsc --noEmit` inside `npm.cmd run build` type-checks `node:fs` and `node:path` in `src/shared/__tests__/priceListImporter.test.ts`. Neither `calcEngine.ts` nor `priceListImporter.ts` imports any Node-specific APIs, keeping them fully browser- and GAS-compatible.
3. **Project Rate Display Formatting**:
   - Multi-rate projects such as `COKS` (common fee rates `70` and `85`) format `commonFeeRateDisplay` using an en-dash (`'70–85'`), matching Mockup 05 and `PHASE-1-PLAN.md`.
