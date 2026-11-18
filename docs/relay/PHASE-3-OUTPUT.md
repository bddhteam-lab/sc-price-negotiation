# PHASE 3 OUTPUT — Mobile-First PWA UI (All 9 Mockup Screens, Admin Users, Versioning & PWA Assets)

Executed by: `[กลาง-สูง · Hydrogen (High)]` (`relay-worker`)

## 1. Execution Summary & Created / Modified Files

All Phase 3 tasks from `docs/relay/PHASE-3-PLAN.md` have been completed, delivering the complete 390px mobile-first PWA UI, API client, installable PWA assets, Google Sign-In + Sandbox role switching, Admin User Management, and Price Version History viewer.

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `public/For_Price_Negotiation_Dashboard_revised.xlsx` | Copied | Copied real Excel workbook (962,608 bytes) so Admin Import screen (`07`) supports 1-tap sample loading |
| `public/pwa-192.png`, `public/pwa-512.png` | Generated | Valid `192x192` and `512x512` PNG app icons composited from `public/sc-logo.png` on `#FD6205` Sunrise Orange background |
| `public/manifest.webmanifest` | Created | Installable PWA web app manifest (`display: standalone`, `theme_color: #FD6205`, `background_color: #FDF3E9`, `192x192` + `512x512` icons) |
| `public/sw.js` | Created | Service Worker caching app shell assets cleanly while bypassing `/api` and non-GET requests |
| `index.html` | Modified | Wired `manifest.webmanifest`, `apple-touch-icon`, Apple PWA meta tags, Google Identity Services client script, and `IBM Plex Sans Thai` / `IBM Plex Mono` fonts |
| `src/main.tsx` | Modified | Registers `/sw.js` cleanly in production builds (`import.meta.env.PROD`) |
| `src/vite-env.d.ts` | Created | Vite client env typings (`VITE_APPS_SCRIPT_URL`, `VITE_GOOGLE_CLIENT_ID`) and Google Identity Services `window.google` declarations |
| `src/client/apiClient.ts` | Created | Frontend `callApi` client sending `POST` with `Content-Type: text/plain;charset=utf-8` to `VITE_APPS_SCRIPT_URL || '/api'` |
| `src/client/formatters.ts` | Created | Shared numeric, Baht, area, percentage, and HH:mm time formatting utilities |
| `src/index.css` | Modified | Complete SC Asset 390px mobile-first styling with SC tokens (`#FD6205`, `#FDF3E9`, `#000000`, `#574946`, `#FDE0D0`, `#E3F2EA/#1F6B44`, `#FDE0D0/#8A3A00`, `#FCE5EB/#A3173F`) and global `button { min-height: 44px }` |
| `src/components/BottomNav.tsx` | Created | Sales bottom navigation bar (`หน้าแรก` / `ประวัติ`) |
| `src/components/LoginScreen.tsx` | Created | Google Sign-In + Local Sandbox quick login (`sales@scasset.com`, `bddhteam@gmail.com`, `nat@scasset.com`) |
| `src/components/SalesHomeScreen.tsx` | Created | Screen `01`: Orange header, global search input, 2-col project grid + dashed placeholder, live search/filter list, `ดูล่าสุด`, role switcher pill for Admin |
| `src/components/UnitCardScreen.tsx` | Created | Screen `02`: Unit prices (`"ยังไม่มีราคา"` fallback), Sales SGP lock (`🔒 ราคาขั้นต่ำ (SGP) เห็นเฉพาะ Admin`) vs Admin cost breakdown, transfer expenses breakdown, blocked unit warning & disabled `คำนวณต่อรอง` CTA |
| `src/components/CalculatorScreen.tsx` | Created | Screens `03a/03b/03c`: 3-mode segmented tabs (`ราคาต่ำสุด`, `คอมสูงสุด`, `เช็กดีล`), inputs + `ฟรีส่วนกลางเพิ่ม` stepper, live server-side `calc.compute`, color-coded status result card, `ที่มาของตัวเลข`, `บันทึกดีล` & `ส่งขออนุมัติ` |
| `src/components/HistoryScreen.tsx` | Created | Screen `04`: `ทั้งหมด`/`รออนุมัติ`/`ของฉัน` filters, deal cards with `เหลือ`/`ขาด` amounts, `ส่งขออนุมัติ` button on yellow deals, and Admin `อนุมัติ` / `ไม่อนุมัติ` actions |
| `src/components/AdminProjectsScreen.tsx` | Created | Screen `05`: Black Admin header, `สลับไปหน้าเซล` toggle, `+ เพิ่มโครงการ`, projects table, `จัดการผู้ใช้` (Users CRUD + role toggle + delete), and `ดูราคาย้อนหลัง (v1/v2)` modal |
| `src/components/AdminProjectFormScreen.tsx` | Created | Screen `06`: 3-step indicator, project info, `กำลังก่อสร้าง` / `Ready to move` toggle with warning banner, 8 numeric default settings, special rules textarea |
| `src/components/AdminImportScreen.tsx` | Created | Screen `07`: `.xlsx` upload + 1-tap sample workbook loader, editable column mapping, `Decoration` block checkboxes (`getDefaultBlockedDecorations`), `ผลตรวจ` validation card, and `เผยแพร่ราคา` button |
| `src/App.tsx` | Modified | Top-level application shell connecting all 9 screens, auth persistence (`sessionStorage`), role view switching (`admin` vs `sales`), recent units history, and notifications |

---

## 2. Acceptance Criteria Self-Check

| AC ID | Acceptance Criterion | Verification Method & Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **AC-3.1** | All 9 screens (`01_home_sales`, `02_unit_card`, `03a_calc_modeA`, `03b_calc_modeB`, `03c_calc_modeC`, `04_history`, `05_admin_projects`, `06_admin_add_project`, `07_admin_import_price`) plus Admin User Management, Price Version History, and Role Switcher are implemented and wired to `/api`. | Implemented all 9 screens + Login, Admin Users CRUD tab, Price Version History modal (`admin.getProjectVersions`), and persistent Admin/Sales view switcher (`viewMode`), wired via `src/client/apiClient.ts` to `/api`. Verified zero client-side `calcEngine` imports in `App.tsx`, `src/client/`, and `src/components/` via `Select-String`. | PASS |
| **AC-3.2** | `public/manifest.webmanifest`, `public/sw.js`, `public/pwa-192.png`, `public/pwa-512.png`, and `public/For_Price_Negotiation_Dashboard_revised.xlsx` exist and are valid. | Verified all files exist in both `public/` and `dist/` (`manifest.webmanifest` 772 B, `sw.js` 1,922 B, `pwa-192.png` 3,838 B, `pwa-512.png` 14,378 B, `For_Price_Negotiation_Dashboard_revised.xlsx` 962,608 B, `sc-logo.png` 17,375 B). Visually inspected `public/pwa-192.png` confirming crisp centered SC logo on `#FD6205`. | PASS |
| **AC-3.3** | `npm.cmd test` passes 100% of tests and `npm.cmd run build` exits with code 0 and zero TypeScript errors. | Ran `npm.cmd test` after final edits: **3 test files passed, 35/35 tests passed** (`3.35s`, exit code `0`). Ran `npm.cmd run build` (`tsc --noEmit && vite build`) after final edits: **exit code 0**, zero TypeScript errors, 43 modules bundled into `dist/`. | PASS |

---

## 3. Notes & Technical Decisions

1. **Zero Client-Side Cost Formulas**:
   - `CalculatorScreen` delegates 100% of calculation requests to the server (`calc.compute`) and never imports `calcEngine.ts` or computes `sgp`/`sgpCost` on the client.
2. **Global Button Touch Target Rule**:
   - `src/index.css` enforces `button { min-height: 44px; }` globally across all interactive controls and navigation pills inside the 390px `.app-shell` viewport.
3. **Production vs Dev Service Worker**:
   - `src/main.tsx` registers `/sw.js` only when `import.meta.env.PROD` is true so Vite dev HMR is never cached/intercepted during development, while `npm.cmd run build` + `npm.cmd run preview` activates full offline shell caching (excluding `/api` POST requests).
