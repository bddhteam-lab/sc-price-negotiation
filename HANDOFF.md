# HANDOFF: SC Price Negotiation PWA (ระบบต่อรองราคาและค่าคอม Agent หน้างาน)
Generated: 2026-11-18 14:07 | Source session: สร้างระบบตั้งแต่ศูนย์ (Phase 0–5B) → ทดสอบ 36/36 unit & E2E tests + Antigravity Browser ครบ 9 หน้าจอ → สร้างฐานข้อมูล Google Sheet จริง (3,714 ห้อง) + Deploy Google Apps Script `@4` (`bddhteam@gmail.com`) + Deploy GitHub Pages (`bddhteam-lab/sc-price-negotiation`) เสร็จสมบูรณ์ 100%

## 🎯 ภาพรวมงาน (สำหรับคนที่เพิ่งเห็นไฟล์นี้ครั้งแรก)
- **นี่คืองานอะไร:** เปลี่ยนไฟล์ Excel `"For Price Negotiation Dashboard"` ของพี่แนท (`chanyapat@scasset.com`) ให้เป็นแอปมือถือแบบ **PWA (390px)** สำหรับเซลทีม SC Asset ใช้ต่อรองราคาขายและค่าคอมมิชชันกับ Agent หน้างาน โดยมีทีม BD ของคุณแบงก์ (`bddhteam@gmail.com`) และพี่แนทเป็นผู้ดูแลระบบ (Admin)
- **ผลลัพธ์สุดท้ายที่ต้องการ (Definition of Done — ทำครบทุกข้อแล้ว):**
  1. นำเข้าไฟล์ `For_Price_Negotiation_Dashboard_revised.xlsx` ได้ครบ 7 โครงการ 3,714 ห้อง (`COLS` 671, `CORM9` 1,500, `COKS` 399, `RFWY` 287, `STS20` 123, `RFKS` 387, `RFS63` 347)
  2. Unit test สูตรคำนวณผ่านครบทุกเคส (รวม 36/36 เทสต์ใน 4 ไฟล์)
  3. ครบทั้ง 9 หน้าจอตาม mockup บนจอมือถือ 390px ปุ่มสูง `>= 44px` และติดตั้งเป็น PWA ได้ (`manifest.webmanifest` + `sw.js`)
  4. ล็อกอินด้วยสิทธิ์ `sales` แล้วไม่มีข้อมูลต้นทุนลับ `M` (`SGP`) หรือ `O` (`SGP+COST`) หลุดไปใน API ข้อมูลห้อง (`catalog.bootstrap`, `units.search`, `units.get`)
  5. Admin เพิ่มโครงการใหม่ ตั้งค่าพารามิเตอร์ อัปโหลดใบราคาเวอร์ชันใหม่ (`v1 -> v2` ดูราคาย้อนหลังได้) จัดการผู้ใช้ (`Users`) และอนุมัติดีลได้โดยไม่ต้องแก้โค้ด
- **ทำไมต้อง handoff ตอนนี้:** ระบบ Deploy ขึ้น Production ทั้งฝั่ง Google Sheet / Apps Script (`bddhteam@gmail.com`) และ GitHub Pages (`bddhteam-lab`) เรียบร้อยแล้ว คุณแบงก์จะนำไปทดลองใช้งานจริงและกลับมาแจ้ง feedback เพิ่มเติมในวันพรุ่งนี้

---

## 📋 SPEC ที่ fix แล้ว (ห้ามถามซ้ำ ห้ามเปลี่ยนเอง)

| รายการ | ค่าที่ตกลงและตั้งค่าแล้ว |
| :--- | :--- |
| **ลิงก์เว็บแอปจริง (GitHub Pages PWA)** | `https://bddhteam-lab.github.io/sc-price-negotiation/` |
| **GitHub Repository (`bddhteam-lab`)** | `https://github.com/bddhteam-lab/sc-price-negotiation` (branch `main`, auto-deploy ผ่าน `.github/workflows/deploy-pages.yml`) |
| **บัญชีเจ้าของ Google / clasp profile** | `bddhteam@gmail.com` (`clasp.cmd --user bddhteam`) |
| **Google Spreadsheet ID (`SC Price Negotiation DB`)** | `14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg` |
| **ลิงก์ Google Sheet (4 ชีต: `Projects`, `Units`, `Users`, `Log`)** | `https://docs.google.com/spreadsheets/d/14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg/edit` |
| **Apps Script `scriptId`** | `1ofr77c2b0aDmXng5QdNGJJGnGPrKHgp2rLNsv7YF4CRbm6evFMCuW_qT` |
| **ลิงก์ Apps Script Editor** | `https://script.google.com/d/1ofr77c2b0aDmXng5QdNGJJGnGPrKHgp2rLNsv7YF4CRbm6evFMCuW_qT/edit` |
| **Apps Script Deployment ID (ล่าสุด `@4`)** | `AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK` |
| **Apps Script Web App `/exec` URL** | `https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec` |
| **รายชื่อผู้ใช้ตั้งต้นในชีต `Users`** | `bddhteam@gmail.com` (`admin`), `chanyapat@scasset.com` (พี่แนท — `admin`), `sales@scasset.com` (`sales` สำหรับทดสอบ) |
| **สถานะเริ่มต้นของ 7 โครงการ** | ตั้งเป็น `กำลังก่อสร้าง` ทั้ง 7 โครงการ (Admin กดเปลี่ยนเป็น `Ready to move` เองในหน้า Admin พร้อมระบบเตือนให้อัปเดตช่อง O) |
| **กฎความลับ `M` และ `O` vs กล่องที่มาของตัวเลข** | ข้อมูลห้อง (`catalog.bootstrap`, `units.search`, `units.get`) ตัด `sgp` (M), `totalCostExpense` (N), `sgpCost` (O) ทิ้งบนเซิร์ฟเวอร์เสมอสำหรับ `sales` (การ์ดห้องแสดง `🔒 ราคาขั้นต่ำ (SGP) เห็นเฉพาะ Admin`); ส่วนหน้าคำนวณ (`calc.compute`) คำนวณที่เซิร์ฟเวอร์และแสดงกล่อง `"ที่มาของตัวเลข"` ให้ทุกคนที่อยู่ใน `Users` เห็นตามที่ตกลงใน `A1` |
| **ธีมสีและฟอนต์ SC Asset** | ส้ม Sunrise `#FD6205`, พื้นหลัง Shell `#FDF3E9`, ดำ `#000000`, Clay `#574946`, Sand `#FDE0D0`, เขียว `#E3F2EA/#1F6B44`, เหลือง `#FDE0D0/#8A3A00`, แดง `#FCE5EB/#A3173F`, ฟอนต์ `IBM Plex Sans Thai` + `IBM Plex Mono`, ปุ่มสูง `>= 44px` |

---

## 🔧 สูตร/Logic/Pipeline ที่ใช้อยู่

1. **สูตรคำนวณกลาง (`src/shared/calcEngine.ts` และ `calculateDealGas` ใน `gas/Code.gs` — พี่แนทคอนเฟิร์มแล้ว ห้ามเปลี่ยน):**
   - `VAT = 1 + (vatPct / 100)` (ตั้งต้น `1.07`)
   - `K = kFactor` (ตั้งต้น `1.046`)
   - `ต้นทุนค่าคอมจริง = (คอม% / 100) × VAT × K`
   - `ฟรีส่วนกลางเพิ่ม = จำนวนปีที่ลูกค้าขอเพิ่ม × ค่าส่วนกลาง 1 ปี` (ค่าเริ่มต้น `0 ปี`)
   - `เงินที่ต้องได้ขั้นต่ำ = O + (โปรเพิ่ม + ฟรีส่วนกลางเพิ่ม + ส่วนเผื่อ) × K`
   - **โหมด A ("ราคาต่ำสุด"):** `ราคาต่ำสุด = ปัดขึ้นหลักหมื่น(เงินที่ต้องได้ขั้นต่ำ ÷ (1 − ต้นทุนค่าคอมจริง))`
   - **โหมด B ("คอมสูงสุด"):** `เพดาน = (ราคา − เงินที่ต้องได้ขั้นต่ำ) ÷ ราคา` → `คอมที่บอก Agent ได้ = ปัดลง((เพดาน% ÷ (VAT × K)) ÷ ขั้นค่าคอม) × ขั้นค่าคอม` (แสดงทั้งคอมที่ให้ได้, เพดาน%, และขั้นถัดไปเกินเพดานเท่าไร)
   - **โหมด C ("เช็กดีล"):** กรอกทั้งราคาและคอม%
   - **เหลือเป็นส่วนเผื่อ (ทุกโหมด):** `ราคา − (ราคา × ต้นทุนค่าคอมจริง) − O − โปรเพิ่ม − ฟรีส่วนกลางเพิ่ม`
     - `< 0` → สีแดง `"ไม่ผ่าน"` (`fail`)
     - `< ส่วนเผื่อ` → สีเหลือง `"ต้องขออนุมัติ"` (`approval`)
     - `>= ส่วนเผื่อ` → สีเขียว `"ผ่าน"` (`pass`)
2. **ตัวนำเข้าไฟล์ Excel (`src/shared/priceListImporter.ts`):**
   - อ่านชีต `PriceList` (หัวตารางแถว 3–6, ข้อมูลเริ่มแถว 7) และหยุดอ่านทันทีเมื่อเจอแถวที่คอลัมน์ `D` และ `E` ว่างติดต่อกัน 50 แถว (เพื่อข้ามแถวว่างท้ายไฟล์ 343,000+ แถวใน `< 1 วินาที`)
   - คำนวณใหม่ทุกโครงการโดยไม่พึ่งค่าในไฟล์: `ค่าโอน (T) = ค่าโอน% × O`, `Sinking (V) = U × L`, `ส่วนกลาง 1 ปี (X) = W × L × 12`
   - ตัดช่องว่างท้ายชื่อแบบห้อง (`K`) อัตโนมัติ (`RFS63` 347 ห้อง)
   - ห้องที่ไม่มี `P` (`CORM9 SH101–106`) หรือไม่มี `P, R` และ `M=0, O=0` (`COLS SHOP1–2`) แสดง `"ยังไม่มีราคา"` และบล็อกปุ่มคำนวณเมื่อ `O <= 0` หรือเมื่อ `Decoration` ตรงกับรายการ `"ห้ามขาย"` ที่ Admin เลือก

---

## 📁 ไฟล์สำคัญในโปรเจกต์

- **ต้นทางข้อมูล & Mockup:**
  - `price-negotiation-assets/price-negotiation-assets/For_Price_Negotiation_Dashboard_revised.xlsx` (และสำเนาใน `public/` สำหรับกดโหลดตัวอย่างในหน้า Admin Import)
  - `price-negotiation-assets/price-negotiation-assets/sc-logo.png` (และสำเนาใน `public/sc-logo.png`)
  - `price-negotiation-assets/price-negotiation-assets/mockup/01_home_sales.png` ถึง `07_admin_import_price.png` (ครบ 9 ภาพ)
- **โค้ด Shared & Tests:**
  - `src/shared/types.ts`: Domain & API types ทั้งหมด
  - `src/shared/calcEngine.ts`: สูตรคำนวณโหมด A, B, C
  - `src/shared/priceListImporter.ts`: ตัวอ่านและตรวจสอบไฟล์ Excel `PriceList`
  - `src/shared/__tests__/`: `calcEngine.test.ts` (17 tests), `priceListImporter.test.ts` (9 tests), `apiService.test.ts` (9 tests), `e2eWorkflow.test.ts` (1 test) — รวม **36/36 ผ่านทั้งหมด**
- **โค้ด Backend (Google Apps Script & Local Dev Sandbox):**
  - `gas/Code.gs`, `gas/appsscript.json`: โค้ด Apps Script ที่ deploy อยู่บน `bddhteam@gmail.com` (`@4`)
  - `src/server/apiService.ts`, `src/server/seedStore.ts`: Local Dev Sandbox API (ผูกใน `vite.config.ts` ที่ `/api`)
- **โค้ด Frontend PWA:**
  - `src/App.tsx`, `src/index.css`, `src/client/apiClient.ts`, `src/client/formatters.ts`
  - `src/components/`: `LoginScreen.tsx`, `SalesHomeScreen.tsx` (01), `UnitCardScreen.tsx` (02), `CalculatorScreen.tsx` (03a–03c), `HistoryScreen.tsx` (04), `AdminProjectsScreen.tsx` (05 + Users + Version History), `AdminProjectFormScreen.tsx` (06), `AdminImportScreen.tsx` (07), `BottomNav.tsx`
  - `public/manifest.webmanifest`, `public/sw.js`, `public/pwa-192.png`, `public/pwa-512.png`

---

## ✅ ทำไปถึงไหน

- ✅ **เสร็จแล้ว 100%:**
  - Phase 0: Project Setup & Core Calculation Engine + 17 Unit Tests
  - Phase 1: Excel Importer (`PriceList` 7 โครงการ 3,714 ห้อง) + 9 Unit Tests
  - Phase 2: Google Apps Script Backend + Local Dev Sandbox API + Role Security + 9 Integration Tests
  - Phase 3: Mobile-First PWA UI ครบ 9 หน้าจอ + หน้าจัดการผู้ใช้ (`Users`) + หน้าดูราคาย้อนหลัง (`v1/v2`) + PWA Manifest & Service Worker
  - Phase 4: E2E Test + ทดสอบจริงและแคปภาพครบ 9 หน้าจอบน Antigravity Browser (`390×844`)
  - Phase 5 & 5B: สร้าง Google Sheet จริง (`14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg`) อัปโหลดครบ 4 ชีต 3,714 ห้อง, ตั้งสิทธิ์ Admin ให้ `bddhteam@gmail.com` และ `chanyapat@scasset.com`, Deploy Apps Script `@4`, และ Deploy GitHub Pages ที่ `https://bddhteam-lab.github.io/sc-price-negotiation/`
- 🔄 **กำลังทำ:** ไม่มี (รอคุณแบงก์ทดลองใช้งานจริงและแจ้งคอมเมนต์เพิ่มเติมในวันพรุ่งนี้)

---

## 🔁 Plan-relay state
- Skill ที่ใช้: `plan-relay-auto`
- ไฟล์แผน: `c:\Users\LENOVO\1xClaude-Projects\sc-price-negotiation\docs\relay\PHASE-5B-PLAN.md`
- OUTPUT ล่าสุด: `c:\Users\LENOVO\1xClaude-Projects\sc-price-negotiation\docs\relay\PHASE-5B-OUTPUT.md`
- FIX LIST ที่ค้าง: ไม่มี
- Phase ปัจจุบัน: Phase 5B จากทั้งหมด 5B Phase (เสร็จครบทุก Phase แล้ว)
- AC ที่ผ่านแล้ว: `AC-0.1..0.3`, `AC-1.1..1.4`, `AC-2.1..2.5`, `AC-3.1..3.3`, `AC-4.1..4.3`, `AC-5.1..5.4`, `AC-5B.1..5B.3` (ผ่านครบ 100%) / AC ที่ยังไม่ผ่าน: ไม่มี
- Fix round ที่ใช้ไป: 0/3

---

## ▶️ Next Step ทันทีที่รับงานต่อ
1. ใช้สกิล `plan-relay-auto` ทำต่อ อ่านแผนจาก `c:\Users\LENOVO\1xClaude-Projects\sc-price-negotiation\docs\relay\PHASE-5B-PLAN.md` และ OUTPUT ล่าสุดก่อน ห้ามเขียนแผนใหม่ ให้ทำต่อจาก Phase 6 (`docs/relay/PHASE-6-PLAN.md`) ตามรายการคอมเมนต์/ฟีดแบ็กที่คุณแบงก์แจ้งหลังจากทดลองใช้งานจริง
2. ก่อนแก้โค้ด: รัน `npm.cmd test` (ต้องผ่าน 36/36) และ `npm.cmd run build` เพื่อยืนยันสถานะตั้งต้น
3. เมื่อแก้โค้ดและตรวจ AC ผ่านแล้ว:
   - หากแก้ฝั่ง Backend (`gas/Code.gs`): รัน `clasp.cmd --user bddhteam push -f` และ Deploy เป็นเวอร์ชันใหม่บน Deployment ID เดิมเสมอ (`clasp.cmd --user bddhteam deploy -i AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK -d "v5 - <คำอธิบาย>"`) เพื่อไม่ให้ URL `/exec` เปลี่ยน
   - หากแก้ฝั่ง Frontend PWA: commit และ `git push origin main` เพื่อให้ GitHub Actions อัปเดต GitHub Pages อัตโนมัติ

---

## ⚠️ ระวัง / ห้ามถามซ้ำ / จุดที่เคยพลาด
- **Windows PowerShell บล็อก `.ps1`:** ต้องใช้ `npm.cmd`, `npx.cmd`, และ `clasp.cmd` เสมอ (ห้ามรัน `npm` หรือ `clasp` เปล่าๆ) และห้ามรัน `npx` ที่รอถาม `(y/n)` แบบ interactive
- **Subagent ห้ามรัน `clasp` หรือ `git push`:** ให้ `relay-worker` เขียนโค้ด รันเทสต์ และ build เท่านั้น ส่วนคำสั่ง `clasp.cmd` และ `git` ให้ตัว Planner/Reviewer รันเมื่อได้รับอนุมัติจากผู้ใช้
- **UTF-8 BOM ใน `gas/appsscript.json`:** ห้ามใช้ PowerShell `Set-Content -Encoding UTF8` เขียนไฟล์ `gas/appsscript.json` เพราะจะติด BOM ทำให้ `clasp push` ฟ้อง `Invalid manifest file` ให้ใช้ `write_file` หรือ Python `encoding='utf-8'` เสมอ
- **ห้ามสร้าง Deployment ID ใหม่บน Apps Script:** ต้องใช้ `-i AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK` เสมอ เพื่อให้ลิงก์ `/exec` เดิมอัปเดตเป็นเวอร์ชันใหม่ (`@5`, `@6`, ...) โดยไม่ต้องแก้ URL ในแอป
- **แถวว่างท้ายชีต `PriceList`:** ไฟล์ Excel จริงมีแถวว่างฟอร์แมตถึงแถว 1,047,624 ตัวนำเข้าตั้งกติกากรอกหยุดเมื่อเจอแถวที่ `D` และ `E` ว่างติดต่อกัน 50 แถวแล้ว ห้ามลบออกเด็ดขาด

---

## ❓ คำถามค้าง
- ไม่มีคำถามค้าง (รอรับคอมเมนต์จากการทดลองใช้งานจริงของคุณแบงก์และพี่แนทในรอบถัดไป)
