<!-- PLAN-RELAY:EXECUTE -->

# PHASE 0 PLAN — Project Setup, Core Calculation Engine & Mandatory Unit Tests

## 1. CONTEXT
We are building the **SC Price Negotiation PWA** for SC Asset's BD & Sales team (`bddhteam@gmail.com`), replacing the Excel workbook `For_Price_Negotiation_Dashboard_revised.xlsx` (`PriceList` and `Calcom` sheets) with a mobile-first PWA (390px) and Google Apps Script + Google Sheets backend.

In Phase 0, we set up the TypeScript + Vite + React + Vitest workspace, configure the SC design tokens and static assets (`sc-logo.png`), and implement the pure, deterministic calculation engine (`src/shared/calcEngine.ts`) along with comprehensive unit tests (`src/shared/__tests__/calcEngine.test.ts`) that verify all 4 mandatory test cases confirmed by P'Nat plus edge cases before building any UI.

> **IMPORTANT WINDOWS POWERSHELL NOTE**: In this environment, PowerShell ExecutionPolicy blocks `npm.ps1` and `npx.ps1`. Always run `npm.cmd` and `npx.cmd` instead of `npm` or `npx`.

## 2. GOAL
Create a clean, buildable Vite + React + TypeScript + Vitest repository with a shared calculation engine (`src/shared/calcEngine.ts`) and shared domain types (`src/shared/types.ts`) that pass 100% of the mandatory calculation test cases and edge-case tests.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` (with Google Fonts `IBM Plex Sans Thai` and `IBM Plex Mono`, mobile viewport meta, title, and SC theme CSS variables).
  - Copy `price-negotiation-assets/price-negotiation-assets/sc-logo.png` to `public/sc-logo.png`.
  - `src/shared/types.ts`: Domain interfaces for `ProjectConfig`, `UnitRecord`, `PublicUnitRecord` (stripped of `M`, `N`, `O`), `CalcInput`, `CalcResult`, `CalcBreakdown`, `DealLogRecord`, `UserRecord`.
  - `src/shared/calcEngine.ts`: Exact implementation of Mode A (`ราคาต่ำสุด`), Mode B (`คอมสูงสุด`), Mode C (`เช็กดีล`), status classification (`pass` / `approval` / `fail`), breakdown (`ที่มาของตัวเลข`), and unit guard checks (`isBlocked`, missing/zero `sgpCost`).
  - `src/shared/__tests__/calcEngine.test.ts`: Unit tests covering all 4 mandatory P'Nat test cases and edge cases.
- **OUT OF SCOPE**:
  - Excel `PriceList` parser (Phase 1)
  - Google Apps Script & Local Dev API Server (Phase 2)
  - Full 9-screen UI components (Phase 3)
  - `git commit`, `git push`, or any deployment (strictly forbidden).

## 4. TASKS
1. **Initialize Project Configuration**:
   - Create `package.json` with scripts (`dev`, `build`, `preview`, `test`: `vitest run`) and dependencies (`react`, `react-dom`, `xlsx`) + devDependencies (`typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `vitest`).
   - Install dependencies using `npm.cmd install`.
   - Create `tsconfig.json` and `vite.config.ts`.
   - Copy `price-negotiation-assets/price-negotiation-assets/sc-logo.png` to `public/sc-logo.png`.
   - Create minimal `index.html`, `src/main.tsx`, `src/App.tsx`, and `src/index.css` defining the SC theme variables:
     - Sunrise Orange: `#FD6205`
     - Background Shell: `#FDF3E9`
     - Black: `#000000`
     - Secondary Text Clay: `#574946`
     - Sand: `#FDE0D0`
     - Card White: `#FFFFFF`
     - Status Green: `#E3F2EA` / `#1F6B44`
     - Status Yellow: `#FDE0D0` / `#8A3A00`
     - Status Red: `#FCE5EB` / `#A3173F`
2. **Define Shared Domain Types (`src/shared/types.ts`)**:
   - Define `ProjectStatus = 'กำลังก่อสร้าง' | 'Ready to move'`.
   - Define `ProjectConfig` with defaults: `transferFeePct = 1`, `kFactor = 1.046`, `vatPct = 7`, `defaultVariance = 50000`, `priceRoundStep = 10000`, `comStepPct = 1`.
   - Define `UnitRecord` (full internal/admin record including `sgp`, `totalCostExpense`, `sgpCost`) and `SalesUnitRecord` (`Omit<UnitRecord, 'sgp' | 'totalCostExpense' | 'sgpCost'>`).
   - Define `CalcMode = 'A' | 'B' | 'C'`, `DealStatus = 'pass' | 'approval' | 'fail'`, `CalcInput`, `CalcBreakdown`, and `CalcResult`.
3. **Implement Core Calculation Engine (`src/shared/calcEngine.ts`)**:
   - Implement exact formulas confirmed by P'Nat:
     - `VAT = 1 + (vatPct / 100)` (default `1.07`)
     - `K = kFactor` (default `1.046`)
     - `actualComCostRate(comPct) = (comPct / 100) * VAT * K`
     - `freeCommonAddition = freeCommonYears * commonFee1Y`
     - `minRequiredAmount = sgpCost + (extraPromo + freeCommonAddition + variance) * K`
     - **Mode A ("ราคาต่ำสุด")**:
       - Input: `commissionPct`
       - `rawPrice = minRequiredAmount / (1 - actualComCostRate(commissionPct))`
       - `sellingPrice = Math.ceil(rawPrice / priceRoundStep) * priceRoundStep`
       - `effectiveCommissionPct = commissionPct`
       - Also calculate `diffFromAgentPrice` and `diffFromAgentPct` when `agentNetPrice` is provided (`agentNetPrice - sellingPrice`, `((agentNetPrice - sellingPrice) / agentNetPrice) * 100`).
     - **Mode B ("คอมสูงสุด")**:
       - Input: `sellingPrice`
       - `ceilingFraction = (sellingPrice - minRequiredAmount) / sellingPrice`
       - `ceilingPct = ceilingFraction * 100`
       - `rawAgentComPct = ceilingPct / (VAT * K)`
       - If `rawAgentComPct < 0`: `effectiveCommissionPct = 0`, `canGiveCommission = false`, `nextStepComPct = comStepPct`
       - Else: `effectiveCommissionPct = Math.floor((rawAgentComPct + 1e-9) / comStepPct) * comStepPct`, `canGiveCommission = true`, `nextStepComPct = effectiveCommissionPct + comStepPct`
       - `nextStepActualCostPct = nextStepComPct * VAT * K`
       - `nextStepExcessPct = nextStepActualCostPct - ceilingPct`
     - **Mode C ("เช็กดีล")**:
       - Input: `sellingPrice`, `commissionPct`
       - `effectiveCommissionPct = commissionPct`
     - **Remaining Variance & Status (all modes)**:
       - `effectiveComRate = actualComCostRate(effectiveCommissionPct)`
       - `commissionAmountExact = sellingPrice * effectiveComRate`
       - `remainingExact = sellingPrice - commissionAmountExact - sgpCost - extraPromo - freeCommonAddition`
       - `remainingVariance = Math.round(remainingExact)`
       - Status:
         - If `remainingExact < 0`: `status = 'fail'` (`ไม่ผ่าน`)
         - Else if `remainingExact < variance`: `status = 'approval'` (`ต้องขออนุมัติ`)
         - Else: `status = 'pass'` (`ผ่าน`)
     - **Breakdown (`ที่มาของตัวเลข`)**:
       - `sellingPrice`: `Math.round(sellingPrice)`
       - `commissionPct`: `effectiveCommissionPct`
       - `effectiveComRatePct`: `Number((effectiveComRate * 100).toFixed(2))`
       - `commissionAmount`: `Math.round(commissionAmountExact)`
       - `sgpPlusCost`: `Math.round(sgpCost)`
       - `freeCommonYears`: `freeCommonYears`
       - `freeCommonAmount`: `Math.round(freeCommonAddition)`
       - `extraPromoAmount`: `Math.round(extraPromo)`
       - `remainingVariance`: `Math.round(remainingExact)`
     - **Guard Checks**:
       - Reject calculation if `isBlocked === true` or `sgpCost === null || sgpCost === undefined || sgpCost <= 0`.
4. **Write Comprehensive Unit Tests (`src/shared/__tests__/calcEngine.test.ts`)**:
   - Test Case 1 (CORM9 B0407: `O = 2368887.046`, `commonFee1Y = 16434`, `variance = 50000`, `K = 1.046`, `VAT = 7%`):
     - Mode A, `com = 2%`, `freeCommonYears = 1`, `extraPromo = 0` -> `sellingPrice = 2,500,000`, `remainingVariance = 58,718`, `status = 'pass'`.
   - Test Case 2 (CORM9 B0407):
     - Mode A, `com = 2%`, `freeCommonYears = 0`, `extraPromo = 0` -> `sellingPrice = 2,480,000`, `remainingVariance = 55,600`, `commissionAmount = 55,513`, `sgpPlusCost = 2,368,887`, `status = 'pass'`.
   - Test Case 3 (CORM9 B0407):
     - Mode B, `sellingPrice = 2,500,000`, `freeCommonYears = 1`, `extraPromo = 0` -> `ceilingPct` rounds to `2.46` (`2.4649...`), `effectiveCommissionPct = 2`, `nextStepComPct = 3`, `nextStepActualCostPct` rounds to `3.36` (`3.35766`), `nextStepExcessPct` rounds to `0.89`, `remainingVariance = 58,718`, `status = 'pass'`.
   - Test Case 4 (CORM9 E0408: `O = 2267846.85`, `commonFee1Y = 16440.6`):
     - Mode C, `sellingPrice = 2,690,000`, `com = 3%`, `freeCommonYears = 0`, `extraPromo = 0` -> `remainingVariance = 331,832`, `status = 'pass'`.
   - Additional Edge Case Tests:
     - Mode C yellow deal (`0 <= remaining < variance`, e.g. CORM9 B0407 `sellingPrice = 2,450,000`, `com = 2%`, `freeCommonYears = 0` -> `remainingVariance = 9,837`, `status = 'approval'`, matching Mockup 04!).
     - Mode C red deal (`remaining < 0`, e.g. CORM9 B0407 `sellingPrice = 2,400,000`, `com = 2%`, `freeCommonYears = 0` -> `remainingVariance = -39,044`, `status = 'fail'`, matching Mockup 04!).
     - Mode C green deal on CORM9 B0407 (`sellingPrice = 2,500,000`, `com = 2%`, `freeCommonYears = 0` -> `remainingVariance = 75,152`, `status = 'pass'`, matching Mockup 03c!).
     - Blocked unit (`isBlocked: true`) and zero-cost unit (`sgpCost: 0`, e.g. COLS `SHOP1`) return guard errors and refuse calculation.

## 5. CONSTRAINTS
- Do NOT alter the formulas confirmed by P'Nat.
- Do NOT run `git commit`, `git push`, `clasp`, or any deployment command.
- Use `npm.cmd` and `npx.cmd` for all commands on Windows PowerShell.
- Keep `src/shared/calcEngine.ts` pure TypeScript with zero browser/Node-specific imports.

## 6. ACCEPTANCE CRITERIA
- **AC-0.1**: `npm.cmd test` runs Vitest and passes 100% of test cases including the 4 mandatory P'Nat cases (`2,500,000 / 58,718`, `2,480,000 / 55,600`, `2.46% / 2% / 58,718`, and `331,832`) plus the Mockup 03c/04 verification cases (`75,152`, `9,837`, `-39,044`) and guard checks.
- **AC-0.2**: `npm.cmd run build` completes with exit code 0 and zero TypeScript errors.
- **AC-0.3**: `public/sc-logo.png` exists and matches the source asset.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-0-OUTPUT.md`.
