# PHASE 5 OUTPUT — Production Readiness, P'Nat Admin Seed, Relative GitHub Pages Paths & CI Workflow

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created / Modified Files

All Phase 5 preparation tasks from `docs/relay/PHASE-5-PLAN.md` have been completed without running `clasp`, `git commit`, or `git push`.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `src/server/seedStore.ts` | Modified | Replaced `nat@scasset.com` with `chanyapat@scasset.com` (`พี่แนท (BD)`, `role: 'admin'`) |
| `src/shared/__tests__/apiService.test.ts` | Modified | Updated `NAT_ADMIN_EMAIL` to `'chanyapat@scasset.com'` |
| `gas/Code.gs` | Modified | Updated `setupSheets()` to seed `bddhteam@gmail.com` (`admin`), `chanyapat@scasset.com` (`admin`), `sales@scasset.com` (`sales`) into `Users` and the 4 Mockup 04 sample deals into `Log`; updated `authenticateCaller_()` to verify Google `idToken` when present and otherwise resolve `req.devEmail || req.email` against active rows in `Users` sheet |
| `src/components/LoginScreen.tsx` | Modified | Updated quick login to `chanyapat@scasset.com`, added approved-email login form ("เข้าสู่ระบบด้วยอีเมลที่ได้รับอนุมัติในชีต Users"), and switched logo path to `${import.meta.env.BASE_URL}sc-logo.png` |
| `src/components/SalesHomeScreen.tsx` | Modified | Updated SC logo `src` to `${import.meta.env.BASE_URL}sc-logo.png` |
| `src/components/AdminImportScreen.tsx` | Modified | Updated sample workbook fetch URL to `${import.meta.env.BASE_URL}For_Price_Negotiation_Dashboard_revised.xlsx` |
| `src/components/AdminProjectsScreen.tsx` | Modified | Updated email input placeholder to `อีเมล เช่น chanyapat@scasset.com` |
| `vite.config.ts` | Modified | Added `base: './'` for relative asset resolution on GitHub Pages subpaths and root hosting |
| `index.html` | Modified | Updated `icon`, `apple-touch-icon`, and `manifest` links to `./sc-logo.png`, `./pwa-192.png`, and `./manifest.webmanifest` |
| `public/manifest.webmanifest` | Modified | Updated `start_url`, `scope`, and icon paths to `./`, `./pwa-192.png`, `./pwa-512.png` |
| `src/main.tsx` | Modified | Updated Service Worker registration path to `${import.meta.env.BASE_URL}sw.js` |
| `.gitignore` | Created | Ignores `node_modules/`, `dist/`, `.clasp.json`, `.clasprc.json`, `.env*.local`, `.deploy.local.json`, `*.log`, `.DS_Store`, `Thumbs.db` |
| `.github/workflows/deploy-pages.yml` | Created | GitHub Actions workflow running `npm ci`, `npm test`, `npm run build` (using repository `vars`), and deploying `dist/` to GitHub Pages on push to `main` |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-5.1** | `chanyapat@scasset.com` is seeded as `admin` in `seedStore.ts`, `gas/Code.gs`, and `LoginScreen.tsx`. | Verified `chanyapat@scasset.com` (`admin`) in `src/server/seedStore.ts`, `gas/Code.gs` (`setupSheets()`), `src/components/LoginScreen.tsx`, and `src/shared/__tests__/apiService.test.ts`; verified zero remaining references to `nat@scasset` across `src/`, `gas/`, `public/`, `index.html`, and `vite.config.ts`. Also verified `gas/Code.gs` JS syntax via Node `vm.Script` (`GAS & manifest OK`). | PASS |
| **AC-5.2** | `vite.config.ts` has `base: './'` and `dist/index.html` uses relative `./` paths so GitHub Pages subpath hosting works without 404s. | Verified `base: './'` in `vite.config.ts` and inspected built `dist/index.html`: `./sc-logo.png`, `./pwa-192.png`, `./manifest.webmanifest`, `./assets/index-C8Bc5peE.js`, `./assets/react-vendor-CI6SGl1L.js`, `./assets/xlsx-vendor-BUW7exb-.js`, `./assets/index-CPVIMqkX.css`. Verified `public/manifest.webmanifest` valid JSON with `./` relative URLs and `public/sw.js` relative shell cache entries. | PASS |
| **AC-5.3** | `.gitignore` and `.github/workflows/deploy-pages.yml` exist and are valid. | Created both files; confirmed `.gitignore` excludes `node_modules/`, `dist/`, `.clasp.json`, `.clasprc.json`, `.env*.local`, `.deploy.local.json`, `*.log` and `.github/workflows/deploy-pages.yml` contains zero secrets and uses `vars.VITE_APPS_SCRIPT_URL` / `vars.VITE_GOOGLE_CLIENT_ID`. | PASS |
| **AC-5.4** | `npm.cmd test` (36/36 tests) and `npm.cmd run build` pass with exit code 0. | Ran `npm.cmd test` (`vitest run`) after final edits: **4 test files passed, 36 tests passed (36/36)**, `5.23s`, exit code `0`. Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edits: **exit code 0**, zero TypeScript errors, zero chunk-size warnings. | PASS |

---

## 3. Notes

- No `clasp`, `git commit`, `git push`, or deployment commands were executed.
- In `gas/Code.gs`, when `req.idToken` is supplied, `authenticateCaller_()` strictly requires `verifyGoogleIdToken(req.idToken)` to succeed (it does not fall back to `devEmail`/`email` when an `idToken` is invalid); when `req.idToken` is omitted, it resolves `req.devEmail || req.email` against active entries in the `Users` sheet so the server always dictates the caller's role.
