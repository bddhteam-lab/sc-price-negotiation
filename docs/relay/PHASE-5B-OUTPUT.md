# PHASE 5B OUTPUT — Bind Production Spreadsheet ID & Apps Script Web App URL

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Modified Files

All Phase 5B tasks from `docs/relay/PHASE-5B-PLAN.md` have been completed without running `clasp`, `git commit`, or `git push`.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `gas/Code.gs` | Modified | Added `var DEFAULT_SPREADSHEET_ID = '14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg';` and updated `getSpreadsheet_()` to resolve `PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID` |
| `src/client/apiClient.ts` | Modified | Exported `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` (`https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec`) and updated `getApiEndpoint()` to return `VITE_APPS_SCRIPT_URL` if set, `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` on non-localhost origins, or `'/api'` on `localhost` / `127.0.0.1` |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-5B.1** | `gas/Code.gs` defines `DEFAULT_SPREADSHEET_ID = '14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg'` and uses it in `getSpreadsheet_()`. | Verified in `gas/Code.gs` lines 12 and 1482–1490; validated JavaScript syntax via Node `vm.Script` (`gas/Code.gs syntax OK`). | PASS |
| **AC-5B.2** | `src/client/apiClient.ts` resolves `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` on non-localhost origins and `'/api'` on `localhost` / `127.0.0.1`. | Verified `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` and `getApiEndpoint()` logic in `src/client/apiClient.ts` lines 3–25. | PASS |
| **AC-5B.3** | `npm.cmd test` (36/36) and `npm.cmd run build` pass with exit code 0. | Ran `npm.cmd test` (`vitest run`) after final edits: **4 test files passed, 36 tests passed (36/36)**, `4.96s`, exit code `0`. Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edits: **exit code 0**, zero TypeScript errors, zero chunk warnings. | PASS |

---

## 3. Notes

- No `clasp`, `git commit`, or `git push` commands were executed.
