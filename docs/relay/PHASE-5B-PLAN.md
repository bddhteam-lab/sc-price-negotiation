<!-- PLAN-RELAY:EXECUTE -->

# PHASE 5B PLAN — Bind Production Spreadsheet ID & Apps Script Web App URL

## 1. CONTEXT
The Google Spreadsheet (`14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg`) and Apps Script Web App (`https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec`) have been provisioned and populated with all 4 sheets (`Projects` 7 rows, `Units` 3,714 rows, `Users` 3 rows, `Log` 4 rows) under `bddhteam@gmail.com`.

We now bind these public resource identifiers into `gas/Code.gs` and `src/client/apiClient.ts` so the production PWA on GitHub Pages connects automatically to the live Apps Script endpoint without requiring manual GitHub repository variable setup, while `localhost` / `127.0.0.1` continues using `/api`.

## 2. GOAL
Configure `DEFAULT_SPREADSHEET_ID` in `gas/Code.gs` and `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` in `src/client/apiClient.ts`, and rebuild `dist/`.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - `gas/Code.gs`: Add `var DEFAULT_SPREADSHEET_ID = '14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg';` and update `getSpreadsheet_()` to use `PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID`.
  - `src/client/apiClient.ts`:
    - Export `DEFAULT_PRODUCTION_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec'`.
    - In `getApiEndpoint()`: if `VITE_APPS_SCRIPT_URL` is set, return it; otherwise if `typeof window !== 'undefined'` and `window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'`, return `DEFAULT_PRODUCTION_APPS_SCRIPT_URL`; otherwise return `'/api'`.
- **OUT OF SCOPE**:
  - Running `clasp`, `git commit`, or `git push`.

## 4. TASKS
1. Update `gas/Code.gs` (`getSpreadsheet_()`).
2. Update `src/client/apiClient.ts` (`getApiEndpoint()`).
3. Run `npm.cmd test` and `npm.cmd run build` and write `docs/relay/PHASE-5B-OUTPUT.md`.

## 5. CONSTRAINTS
- Do NOT run `clasp`, `git commit`, or `git push`.

## 6. ACCEPTANCE CRITERIA
- **AC-5B.1**: `gas/Code.gs` defines `DEFAULT_SPREADSHEET_ID = '14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg'` and uses it in `getSpreadsheet_()`.
- **AC-5B.2**: `src/client/apiClient.ts` resolves `DEFAULT_PRODUCTION_APPS_SCRIPT_URL` on non-localhost origins and `'/api'` on `localhost` / `127.0.0.1`.
- **AC-5B.3**: `npm.cmd test` (36/36) and `npm.cmd run build` pass with exit code 0.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-5B-OUTPUT.md`.
