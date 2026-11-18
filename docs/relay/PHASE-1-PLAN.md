<!-- PLAN-RELAY:EXECUTE -->

# PHASE 1 PLAN — Excel Importer (`PriceList` Parser, Validator & Clean Rules)

## 1. CONTEXT
In Phase 0, we established the project setup, domain types (`src/shared/types.ts`), and pure calculation engine (`src/shared/calcEngine.ts`).
In Phase 1, we build the `PriceList` Excel importer (`src/shared/priceListImporter.ts`) that parses `For_Price_Negotiation_Dashboard_revised.xlsx` (both in Node/Vitest and in the browser via SheetJS `xlsx`), handles all data-cleaning rules required by Khun Bank, supports filtering by a single project (like `RFS63` in Mockup 07) or importing all projects at once, and produces both cleaned `UnitRecord[]`, `ProjectConfig[]` summaries, and a detailed `ImportValidationReport`.

> **CRITICAL PERFORMANCE NOTE**: `For_Price_Negotiation_Dashboard_revised.xlsx` has ~343,000+ empty formatted rows at the bottom of the `PriceList` sheet (after row 3720). Do NOT let SheetJS iterate all 343,000+ blank rows. Stop or clamp the row range when encountering consecutive empty rows where both Project (`D`) and Unit Code (`E`) are empty (or pass `sheetRows: 10000` / iterate row-by-row stopping after 50 consecutive empty `D`+`E` rows).

## 2. GOAL
Implement a fast, deterministic Excel `PriceList` importer (`src/shared/priceListImporter.ts`) and verify via Vitest (`src/shared/__tests__/priceListImporter.test.ts`) against the real file `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` that all 7 projects and 3,714 units are imported and cleaned with 100% accuracy.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - `src/shared/types.ts`: Extend shared types with `ColumnMapping`, `DecorationSummaryItem`, `ImportValidationReport`, `ImportOptions`, and `ImportResult` (plus any additional fields on `UnitRecord` / `ProjectConfig` needed for UI & versioning, such as `unitSuffix`, `decoration`, `commonFeeRateDisplay`, `sinkingRateDisplay`).
  - `src/shared/priceListImporter.ts`:
    - Parse workbook from `ArrayBuffer | Uint8Array` using `xlsx`.
    - Support configurable `ColumnMapping` (defaulting to `B` Decoration, `C` House No, `D` Project, `E` Unit Code, `F` Combine Code, `G` Building, `H` Floor, `I` Unit Suffix, `J` Unit Type, `K` Room Type, `L` Area, `M` SGP, `N` Total Cost Expense, `O` SGP+COST, `P` SC Price, `R` Agent Net Price, `T` Transfer Fee, `U` Sinking Rate, `V` Sinking Fund, `W` Common Fee Rate, `X` Common Fee 1Y).
    - Filter optionally by `projectCode` (for single-project import like Mockup 07 `RFS63`) or import all projects.
    - Trim trailing/leading spaces on `roomCategory` (`K`) and count how many rows had whitespace trimmed (`trimmedRoomTypeCount`, e.g., `347` for `RFS63`).
    - Count how many rows had blank `T`, `V`, or `X` in the raw Excel (`missingExpenseColsCount`, e.g., `123` for `STS20`, `387` for `RFKS`, `347` for `RFS63`, total `857`).
    - Compute `transferFee = (transferFeePct / 100) * (sgpCost ?? 0)`, `sinkingFund = effectiveU * areaSqm`, and `commonFee1Y = effectiveW * areaSqm * 12` for **every unit in every project** (never rely on Excel's `T`, `V`, `X`).
    - Handle missing `P` (`scPrice = null`) and missing `R` (`agentNetPrice = null`):
      - `COLS` `SHOP1`, `SHOP2` have `P = null`, `R = null` (and `M = 0`, `O = 0`).
      - `CORM9` `SH101–SH106` have `P = null`, `R > 0`.
    - Extract unique `Decoration` (`B`) texts with counts, provide `isDefaultBlockedDecoration(text)` helper (matching `"ห้ามขาย"`, `"Office"`, `"ห้องตัวอย่าง"`, `"Show Unit"`, `"Show unit"`, `"BACK OFFICE"`, `"Sale office"`, `"ห้องรับรอง"`, `"ห้องปล่อยเช่า"`, `"ห้องเก็บของ"`, `"Spare"`), and allow caller/Admin to pass custom `blockedDecorations: string[]`.
    - Mark units whose `decoration` is in `blockedDecorations` with `isBlocked = true`, `unitStatus = 'ห้ามขาย'`, `blockReason = decoration`. Mark units with `sgpCost === null || sgpCost <= 0` with `isBlocked = true`, `unitStatus = 'ยังไม่มีราคา'`, `blockReason = 'ยังไม่มีราคาต้นทุน (SGP/O)'`. Other units get `unitStatus = 'พร้อมขาย'`.
    - Validate duplicate `combineCode` (`D + E`), missing (`null`/blank) `SGP` (`M`), missing (`null`/blank) `SGP+COST` (`O`), and zero `SGP`/`O` (`SHOP1–2`).
    - Summarize per-project metadata (`unitCount`, `sinkingRatePerSqm`, `commonFeeRatePerSqmMonth`, `commonFeeRateDisplay` e.g. `"70–85"` for `COKS` and `"55"` for `CORM9`).
  - `src/shared/__tests__/priceListImporter.test.ts`: Vitest suite loading the real `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` and verifying all counts, edge cases, and integration with `calculateDeal`.
- **OUT OF SCOPE**:
  - Apps Script & Dev API Server (Phase 2)
  - React UI screens (Phase 3)
  - Git commit / push / deploy.

## 4. TASKS
1. **Update `src/shared/types.ts`**:
   - Add `unitSuffix?: string`, `decoration?: string | null`, `combineCode: string`, `priceVersion?: number`, `isActiveVersion?: boolean` to `UnitRecord` (keeping backward compatibility with Phase 0 tests).
   - Add `sinkingRateDisplay?: string` and `commonFeeRateDisplay?: string` to `ProjectConfig`.
   - Define `ColumnMapping`, `DecorationSummaryItem`, `ImportValidationReport`, `ImportOptions`, and `ImportResult`.
2. **Implement `src/shared/priceListImporter.ts`**:
   - Export `DEFAULT_COLUMN_MAPPING`.
   - Export `isDefaultBlockedDecoration(decoration: string): boolean` and `getDefaultBlockedDecorations(decorations: string[]): string[]`.
   - Export `parsePriceListWorkbook(buffer: ArrayBuffer | Uint8Array, options?: ImportOptions): ImportResult`.
   - Ensure fast row scanning (stop after encountering 50 consecutive empty rows after row 7 so the 343k trailing blank rows in `PriceList` are skipped in `< 50ms`).
   - Implement all cleaning, calculation (`T`, `V`, `X`), Decoration blocking, and validation summary logic.
3. **Write `src/shared/__tests__/priceListImporter.test.ts`**:
   - Load `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx`.
   - Verify total units = `3,714` across `7` projects:
     - `COLS`: `671`
     - `CORM9`: `1,500`
     - `COKS`: `399`
     - `RFWY`: `287`
     - `STS20`: `123`
     - `RFKS`: `387`
     - `RFS63`: `347`
   - Verify `STS20` (123), `RFKS` (387), `RFS63` (347) have `missingExpenseColsCount = 857` total, and all 857 units have computed `transferFee > 0`, `sinkingFund > 0`, `commonFee1Y > 0`.
   - Verify `RFS63` single-project filter (`projectCode: 'RFS63'`) returns `347` units, `duplicateCount = 0`, `missingSgpCount = 0`, `missingExpenseColsCount = 347`, `trimmedRoomTypeCount = 347`, and no unit in `RFS63` has trailing spaces in `roomCategory`.
   - Verify `COLS` `SHOP1` & `SHOP2` have `scPrice === null`, `agentNetPrice === null`, `unitStatus === 'ยังไม่มีราคา'`, and `isBlocked === true`.
   - Verify `CORM9` `SH101–SH106` have `scPrice === null` and `agentNetPrice !== null`.
   - Verify `COKS` project summary has `commonFeeRateDisplay === '70–85'` and `sinkingRateDisplay === '500'`.
   - Verify `CORM9 B0407` and `CORM9 E0408` parsed from the real Excel file pass directly into `calculateDeal` and produce the exact numbers from Phase 0 (`2,500,000 / 58,718`, `2,480,000 / 55,600`, `2.46% / 2% / 58,718`, `331,832`)!
   - Verify custom `blockedDecorations` selection blocks matching units from `calculateDeal` (`UNIT_BLOCKED`).

## 5. CONSTRAINTS
- Do NOT break any existing Phase 0 unit tests in `src/shared/__tests__/calcEngine.test.ts`.
- Do NOT modify confirmed calculation formulas.
- Always run `npm.cmd test` and `npm.cmd run build`.
- Do NOT run `git commit`, `git push`, or `deploy`.

## 6. ACCEPTANCE CRITERIA
- **AC-1.1**: `npm.cmd test` passes 100% of Phase 0 + Phase 1 tests, and the Excel import test completes in `< 5 seconds` (skipping the 343k blank trailing rows).
- **AC-1.2**: Importing `For_Price_Negotiation_Dashboard_revised.xlsx` yields exactly 7 projects and 3,714 units (`COLS: 671, CORM9: 1500, COKS: 399, RFWY: 287, STS20: 123, RFKS: 387, RFS63: 347`).
- **AC-1.3**: All cleaning and validation rules pass: `STS20/RFKS/RFS63` (857 units) have computed `T, V, X`; `RFS63` (347 units) has trailing whitespace trimmed; `COLS SHOP1–2` and `CORM9 SH101–106` missing prices are properly handled; `Decoration` blocking works and integrates with `calculateDeal`.
- **AC-1.4**: `npm.cmd run build` exits with code 0 and zero TypeScript errors.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-1-OUTPUT.md`.
