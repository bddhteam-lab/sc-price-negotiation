<!-- PLAN-RELAY:EXECUTE -->

# PHASE 5 PLAN — Production Readiness, P'Nat Admin Seed, Relative GitHub Pages Paths & CI Workflow

## 1. CONTEXT
Khun Bank has approved production deployment to `bddhteam@gmail.com` (Google Sheets + Apps Script) and GitHub (`bddhteam-lab`), and provided P'Nat's official email: `chanyapat@scasset.com` (with full `admin` privileges alongside `bddhteam@gmail.com`).

Before provisioning the live Google Sheet / Apps Script and pushing to GitHub Pages (`https://bddhteam-lab.github.io/sc-price-negotiation/`), we need `relay-worker` to prepare the codebase so that:
1. `chanyapat@scasset.com` is seeded as `admin` in `src/server/seedStore.ts`, `gas/Code.gs` (`setupSheets()`), `src/components/LoginScreen.tsx`, and `src/shared/__tests__/apiService.test.ts`.
2. `gas/Code.gs` `authenticateCaller_(req)` supports both Google `id_token` verification AND approved-email lookup (`req.devEmail` / `req.email`) against the `Users` sheet (`active === true`), resolving the user's `role` strictly from the `Users` sheet on the server.
3. `src/components/LoginScreen.tsx` includes a clean email sign-in form (for any approved email in the `Users` sheet) in addition to Google Sign-In (`VITE_GOOGLE_CLIENT_ID`) and quick-login buttons for `bddhteam@gmail.com`, `chanyapat@scasset.com`, and `sales@scasset.com`.
4. All asset and PWA paths (`vite.config.ts`, `index.html`, `public/manifest.webmanifest`, `public/sw.js`, `src/main.tsx`, `SalesHomeScreen.tsx`, `LoginScreen.tsx`, `AdminImportScreen.tsx`) use relative paths (`base: './'` / `${import.meta.env.BASE_URL}...`) so the PWA works identically on both root (`http://127.0.0.1:4173/`) and GitHub Pages subpaths (`https://bddhteam-lab.github.io/sc-price-negotiation/`).
5. `.gitignore` and `.github/workflows/deploy-pages.yml` are created for clean, secret-free GitHub Pages deployment.

## 2. GOAL
Update the codebase with `chanyapat@scasset.com`, production Apps Script auth support, relative GitHub Pages asset paths, `.gitignore`, and GitHub Pages workflow, with all tests and builds passing.

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - `src/server/seedStore.ts`: Replace `nat@scasset.com` with `chanyapat@scasset.com` (`พี่แนท (BD)`, `role: 'admin'`).
  - `src/shared/__tests__/apiService.test.ts`: Update `NAT_ADMIN_EMAIL` to `'chanyapat@scasset.com'`.
  - `gas/Code.gs`:
    - In `setupSheets()`, seed `bddhteam@gmail.com` (`admin`), `chanyapat@scasset.com` (`admin`), and `sales@scasset.com` (`sales`) into `Users` when initializing a new sheet, and also seed the 4 initial Mockup 04 deals into `Log` if `Log` is empty.
    - In `authenticateCaller_(req)`, check `verifyGoogleIdToken(req.idToken)` first; if not present, fall back to `req.devEmail` (normalized lowercase email) looked up against active rows in `Users` sheet.
  - `src/components/LoginScreen.tsx`:
    - Update quick-login account from `nat@scasset.com` to `chanyapat@scasset.com`.
    - Add an email input form ("เข้าสู่ระบบด้วยอีเมลที่ได้รับอนุมัติในชีต Users") so any team member (`bddhteam@gmail.com`, `chanyapat@scasset.com`, or new sales emails added by Admin) can type their email and sign in directly on mobile PWA.
  - `vite.config.ts`, `index.html`, `public/manifest.webmanifest`, `public/sw.js`, `src/main.tsx`, `src/components/SalesHomeScreen.tsx`, `src/components/LoginScreen.tsx`, `src/components/AdminImportScreen.tsx`:
    - Set `base: './'` in `vite.config.ts` and use relative paths (`./...` or `${import.meta.env.BASE_URL}...`) for `sc-logo.png`, `pwa-192.png`, `pwa-512.png`, `manifest.webmanifest`, `sw.js`, and `For_Price_Negotiation_Dashboard_revised.xlsx`.
  - `.gitignore`: Ignore `node_modules/`, `dist/`, `.clasp.json`, `.clasprc.json`, `.env*.local`, `.deploy.local.json`, `*.log`.
  - `.github/workflows/deploy-pages.yml`: GitHub Actions workflow to build and deploy `dist/` to GitHub Pages on push to `main`.
- **OUT OF SCOPE**:
  - Running `clasp`, `git commit`, or `git push` (the Coordinator/Reviewer will execute the live `clasp` and `git` deployment steps after reviewing this phase).

## 4. TASKS
1. Update `src/server/seedStore.ts`, `src/shared/__tests__/apiService.test.ts`, `gas/Code.gs`, and `src/components/LoginScreen.tsx` with `chanyapat@scasset.com` and email login support.
2. Update `vite.config.ts`, `index.html`, `public/manifest.webmanifest`, `public/sw.js`, `src/main.tsx`, and component asset references to use relative paths (`./`).
3. Create `.gitignore` and `.github/workflows/deploy-pages.yml`.
4. Run `npm.cmd test` and `npm.cmd run build` and write `docs/relay/PHASE-5-OUTPUT.md`.

## 5. CONSTRAINTS
- Never commit or include any secret keys, passwords, or OAuth tokens in any tracked file.
- Do NOT run `clasp`, `git commit`, or `git push` inside the subagent.

## 6. ACCEPTANCE CRITERIA
- **AC-5.1**: `chanyapat@scasset.com` is seeded as `admin` in `seedStore.ts`, `gas/Code.gs`, and `LoginScreen.tsx`.
- **AC-5.2**: `vite.config.ts` has `base: './'` and `dist/index.html` uses relative `./` paths so GitHub Pages subpath hosting works without 404s.
- **AC-5.3**: `.gitignore` and `.github/workflows/deploy-pages.yml` exist and are valid.
- **AC-5.4**: `npm.cmd test` (36/36 tests) and `npm.cmd run build` pass with exit code 0.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-5-OUTPUT.md`.
