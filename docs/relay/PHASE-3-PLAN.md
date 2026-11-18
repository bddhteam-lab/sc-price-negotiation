<!-- PLAN-RELAY:EXECUTE -->

# PHASE 3 PLAN — Mobile-First PWA UI (All 9 Mockup Screens, Admin Users, Versioning & PWA Assets)

## 1. CONTEXT
Phases 0, 1, and 2 are complete and passing (`35/35` tests):
- `src/shared/calcEngine.ts` (pure calculation engine for Modes A, B, C)
- `src/shared/priceListImporter.ts` (fast SheetJS `.xlsx` parser & validator for `PriceList`)
- `src/server/apiService.ts` + `src/server/seedStore.ts` + `vite.config.ts` (`POST /api` middleware seeded with all 7 projects / 3,714 units, strict stripping of `M`, `N`, `O` for `sales`, and `gas/Code.gs` for production).

In Phase 3, we build the complete mobile-first PWA frontend (`390px` target viewport) matching all 9 mockups in `price-negotiation-assets/price-negotiation-assets/mockup/`, plus Google Sign-In + Dev role switcher, Admin User Management (`Users` sheet CRUD for `bddhteam@gmail.com`, P'Nat, and sales team), Admin Price Version History viewer (`ราคาชุดเก่าต้องดูย้อนหลังได้`), and installable PWA assets (`manifest.webmanifest`, `sw.js`, `192x192` & `512x512` icons).

## 2. GOAL
Build a complete, responsive 390px PWA frontend in React + TypeScript that implements all 9 mockup screens (`01` through `07`, including `03a`, `03b`, `03c`), enforces minimum `44px` button height across all interactive controls, registers a valid PWA manifest and Service Worker, and connects cleanly to the backend API (`POST /api` locally or `VITE_APPS_SCRIPT_URL` in production).

## 3. SCOPE / OUT OF SCOPE
- **IN SCOPE**:
  - Copy `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` to `public/For_Price_Negotiation_Dashboard_revised.xlsx` so the Admin Import screen (`07`) supports both standard `<input type="file" accept=".xlsx" />` AND a 1-tap "โหลดไฟล์ตัวอย่างจริง (3,714 ห้อง)" button for instant browser testing.
  - Generate `public/pwa-192.png` (`192x192`) and `public/pwa-512.png` (`512x512`), create `public/manifest.webmanifest` and `public/sw.js`, and wire them into `index.html` and `src/main.tsx`.
  - Create API client (`src/client/apiClient.ts`) using `POST` with `Content-Type: text/plain;charset=utf-8` (CORS-safe for Google Apps Script and supported by Vite `/api` middleware).
  - Build all 9 screens + Login + Admin User Management + Admin Price Version History:
    1. **Login / Role Switcher**: Google Sign-In button + Sandbox quick login (`sales@scasset.com`, `bddhteam@gmail.com`, `nat@scasset.com`). When logged in as `admin`, provide a persistent top-bar switch between **Admin View (`ADMIN`)** and **Sales View (`เซล`)** per decision `A4`.
    2. **Screen 01 (`01_home_sales.png`) — Sales Home**:
       - Sunrise Orange header (`#FD6205`) with `/sc-logo.png`, `ต่อรองราคา` / `BD Team`, role pill (`เซล`), global unit search input (`พิมพ์รหัสห้อง เช่น B0407`).
       - Project grid (`7 โครงการ · 3,714 ห้อง` or dynamic count when Admin adds projects) with 2-column cards + dashed placeholder card `+ โครงการใหม่ขึ้นที่นี่ทันทีที่ Admin เพิ่ม`.
       - Tapping a project filters/displays units for that project; typing in search searches across all projects (or selected project).
       - `ดูล่าสุด` section showing recently viewed units (`CORM9 · B0407` and `CORM9 · E0408` by default).
       - Bottom navigation bar (`หน้าแรก` / `ประวัติ`).
    3. **Screen 02 (`02_unit_card.png`) — Unit Card**:
       - Orange header with `< {projectCode}`, large `IBM Plex Mono` unit code (`B0407`), `{roomCategory} · {areaSqm} ตร.ม. · ตึก {building} ชั้น {floor}`, and status badge (`พร้อมขาย` / `ห้ามขาย` / `ยังไม่มีราคา`).
       - Special rule / blocked unit warning banner if `project.specialRules` or `unit.isBlocked`.
       - Card `ราคาตามใบราคา`:
         - `ราคา Agent (คอม 10%)`: formatted price or `"ยังไม่มีราคา"` (for `COLS SHOP1–2`).
         - `ราคา SC ขายเอง`: formatted price or `"ยังไม่มีราคา"` (for `COLS SHOP1–2` and `CORM9 SH101–106`).
         - SGP box: for `sales`, shows `🔒 ราคาขั้นต่ำ (SGP)` — `เห็นเฉพาะ Admin` (never receives M or O from server); for `admin`, displays the actual SGP (`M`) and SGP+COST (`O`).
       - Card `ฟรีค่าใช้จ่ายวันโอน`: `ค่าส่วนกลาง 1 ปี`, `Sinking Fund`, `ค่าโอน 1%`, and `รวม`.
       - Card `บ้านเลขที่` & `Unit Type`.
       - Sticky bottom CTA `คำนวณต่อรอง >` (`min-height: 52px`, `#000000`), **disabled** when `unit.isBlocked === true` (e.g. Decoration `"ห้ามขาย"` or missing/zero SGP+COST).
    4. **Screens 03a, 03b, 03c (`03a_calc_modeA_min_price.png`, `03b_calc_modeB_max_commission.png`, `03c_calc_modeC_check_deal.png`) — 3-Mode Calculator**:
       - Orange header with `< ข้อมูลห้อง`, `{projectCode} · {unitCode}`, `{roomCategory} · {areaSqm} ตร.ม.`, `ราคา Agent (คอม 10%) ...`.
       - 3-mode segmented tabs (`อยากรู้อะไร`):
         - Mode A: `ราคาต่ำสุด` / `ใส่ค่าคอม`
         - Mode B: `คอมสูงสุด` / `ใส่ราคา`
         - Mode C: `เช็กดีล` / `ใส่ทั้งคู่`
       - Dynamic inputs per mode + shared inputs (`โปรเพิ่มเติม (บาท)`, `ฟรีส่วนกลางเพิ่ม` `− / X ปี / +` stepper, `ส่วนเผื่อ (Variance)` default `50,000`, Ready-to-move footnote).
       - Calls server `calc.compute` and renders:
         - Status Result Card (Green `#E3F2EA/#1F6B44`, Yellow `#FDE0D0/#8A3A00`, Red `#FCE5EB/#A3173F`) matching `03a`, `03b`, `03c` exact wording and numbers (`ขายได้ต่ำสุด`, `ต่ำกว่าราคา Agent ...`, `ให้คอม Agent ได้สูงสุด`, `เพดานรวม VAT + ค่า K ... · คอม X% = Y% เกินเพดาน`, `ผลเช็กดีลนี้`).
         - `ที่มาของตัวเลข` card showing line-by-line deductions (`ราคาขาย`, `หัก ค่าคอม`, `หัก SGP + ต้นทุนโปร`, `หัก ฟรีส่วนกลางเพิ่ม`, `หัก โปรเพิ่มเติม`, `เหลือเป็นส่วนเผื่อ`).
         - Bottom buttons: `บันทึกดีล` and `ส่งขออนุมัติ` (`min-height: 48px`).
    5. **Screen 04 (`04_history.png`) — Deal History & Approval**:
       - Orange header `ประวัติการต่อรอง` with filter pills `ทั้งหมด`, `รออนุมัติ`, `ของฉัน`.
       - Deal cards displaying `{projectCode} · {unitCode}`, status pill (`รออนุมัติ` / `ผ่าน` / `ไม่ผ่าน` / `อนุมัติแล้ว` / `ไม่อนุมัติ`), `{sellingPrice} · คอม {commissionPct}%`, `เหลือ {remaining}` or `ขาด {abs(remaining)}`, and metadata line.
       - Yellow deals not yet sent for approval have a `ส่งขออนุมัติ` button (`deals.requestApproval`).
       - When viewed by `admin`, pending deals (`รออนุมัติ`) display `อนุมัติ` and `ไม่อนุมัติ` buttons (`deals.review`).
    6. **Screen 05 (`05_admin_projects.png`) — Admin Projects List (+ Users & Version History access)**:
       - Black header (`#000000`) with `ADMIN` orange pill, email, mode switcher (`สลับไปหน้าเซล`), and tabs/buttons for `โครงการทั้งหมด` and `จัดการผู้ใช้ (Users)`.
       - Orange CTA `+ เพิ่มโครงการ` (`min-height: 52px`).
       - Projects table showing `โครงการ` (`COLS`, `CORM9`, `COKS`, `RFWY`, `STS20`, `RFKS`, `RFS63`, + any new projects), `ห้อง · Sinking / ส่วนกลาง` (`671 · 500 / 58`, `399 · 500 / 70–85`, etc.), `สถานะ` (`กำลังก่อสร้าง` / `Ready to move`), and actions per project: `ตั้งค่า`, `อัปโหลดราคา`, `ดูราคาย้อนหลัง (v{priceVersion})`.
       - Admin Users section/modal allowing Admin to view, add (e.g. P'Nat's email or new sales email), toggle role (`admin` / `sales`), or remove users.
       - Admin Version History modal/drawer allowing Admin to select version (`v1`, `v2`, ...) of a project and view historical unit prices (`ราคาชุดเก่าต้องดูย้อนหลังได้`).
    7. **Screen 06 (`06_admin_add_project.png`) — Admin Add / Edit Project**:
       - Black header with `< โครงการทั้งหมด`, title `เพิ่มโครงการ` (or `ตั้งค่าโครงการ`), 3-step indicator (`1 ตั้งค่า` | `2 อัปโหลดราคา` | `3 ตรวจ + เผยแพร่`).
       - Form cards matching Mockup 06: `ข้อมูลโครงการ` (`รหัสโครงการ`, `ชื่อโครงการ`, `สถานะโครงการ` toggle `กำลังก่อสร้าง` / `Ready to move` with prominent warning banner when `Ready to move` is selected!), `ค่าตั้งต้นของโครงการ` (8 numeric fields), `กฎพิเศษของโครงการ`.
       - Save button (`บันทึกโครงการ`) & `บันทึกและไปอัปโหลดราคา >`.
    8. **Screen 07 (`07_admin_import_price.png`) — Admin Import PriceList & Publish**:
       - Black header with `< โครงการทั้งหมด`, title `อัปโหลดราคา · {projectCode}`, 3-step indicator.
       - File upload box + 1-tap button to load `/For_Price_Negotiation_Dashboard_revised.xlsx` (filtering by the selected project e.g. `RFS63` or all projects).
       - `จับคู่คอลัมน์ (ระบบเดาให้ แก้ได้)` card (`D + E`, `K · L`, `M`, `O`, `P · R`, `U · W`, `B`) with editable column letters.
       - `เลือกสถานะห้อง (Decoration) ที่ห้ามขาย` card showing checkboxes for unique `Decoration` values found in the sheet (pre-selected with `getDefaultBlockedDecorations`).
       - `ผลตรวจ` card showing `✓ พบ {count} ห้อง · รหัสซ้ำ {dup} · ไม่มี SGP {missingSgp}`, warning box for blank `ค่าโอน / Sinking / ส่วนกลาง ว่าง {missingExpenseColsCount} ห้อง`, and info line `ตัดช่องว่างท้ายชื่อแบบห้องให้ {trimmedRoomTypeCount} ห้อง`.
       - Orange publish button `เผยแพร่ราคาชุดแรก (v1)` / `เผยแพร่ราคาชุดใหม่ (v{nextVersion})` calling `admin.publishUnits`.
- **OUT OF SCOPE**:
  - Production Google Cloud / GitHub Pages deployment (Phase 5).

## 4. TASKS
1. **Prepare Static PWA Assets**:
   - Copy `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` to `public/For_Price_Negotiation_Dashboard_revised.xlsx`.
   - Generate valid PNG icons `public/pwa-192.png` and `public/pwa-512.png`, create `public/manifest.webmanifest` and `public/sw.js`, and update `index.html` and `src/main.tsx`.
2. **Create Frontend API Client (`src/client/apiClient.ts`)**:
   - Implement `callApi<T>(action, payload, auth)` sending `POST` with `Content-Type: text/plain;charset=utf-8` to `import.meta.env.VITE_APPS_SCRIPT_URL || '/api'`.
3. **Implement Complete UI & Styling (`src/App.tsx`, `src/index.css`, and modular screen components under `src/components/`)**:
   - Implement all 9 mockup screens (`01` Home, `02` Unit Card, `03a/03b/03c` Calculator, `04` History, `05` Admin Projects + Users + Version History, `06` Admin Add/Edit Project, `07` Admin Import PriceList).
   - Ensure all buttons and interactive pills have `min-height: 44px` and mobile layout fits `390px` width cleanly without horizontal scrollbars.
4. **Verify Build & Tests**:
   - Run `npm.cmd test` and `npm.cmd run build` to ensure zero TypeScript or bundle errors.

## 5. CONSTRAINTS
- Every interactive `<button>` must have height `>= 44px`.
- Follow the SC color palette (`#FD6205`, `#FDF3E9`, `#000000`, `#574946`, `#FDE0D0`, `#E3F2EA/#1F6B44`, `#FDE0D0/#8A3A00`, `#FCE5EB/#A3173F`) and fonts (`IBM Plex Sans Thai`, `IBM Plex Mono`).
- Never compute or store `M` (`sgp`) or `O` (`sgpCost`) on the client for `sales` users; always use `calc.compute` on the server.
- Do NOT run `git commit`, `git push`, `clasp`, or `deploy`.

## 6. ACCEPTANCE CRITERIA
- **AC-3.1**: All 9 screens (`01_home_sales`, `02_unit_card`, `03a_calc_modeA`, `03b_calc_modeB`, `03c_calc_modeC`, `04_history`, `05_admin_projects`, `06_admin_add_project`, `07_admin_import_price`) plus Admin User Management, Price Version History, and Role Switcher are implemented and wired to `/api`.
- **AC-3.2**: `public/manifest.webmanifest`, `public/sw.js`, `public/pwa-192.png`, `public/pwa-512.png`, and `public/For_Price_Negotiation_Dashboard_revised.xlsx` exist and are valid.
- **AC-3.3**: `npm.cmd test` passes 100% of tests and `npm.cmd run build` exits with code 0 and zero TypeScript errors.

## 7. DELIVERY FORMAT
Save the execution summary and AC self-check table to `docs/relay/PHASE-3-OUTPUT.md`.
