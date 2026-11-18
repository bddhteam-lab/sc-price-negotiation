# HANDOFF: SC Price Negotiation PWA (`sc-price-negotiation`)

Generated: 2026-11-18 | Status: Phase 0–5B Completed · Google Sheet (3,714 units) & Apps Script (`@3`) Provisioned in `bddhteam@gmail.com`

---

## 📋 SPEC ที่ fix แล้ว (ห้ามถามซ้ำ ห้ามเปลี่ยนเอง)

| รายการ | ค่า |
| :--- | :--- |
| **บัญชีเจ้าของ Google / clasp profile** | `bddhteam@gmail.com` (`clasp.cmd --user bddhteam`) |
| **Google Spreadsheet ID (`SC Price Negotiation DB`)** | `14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg` |
| **ลิงก์ Google Sheet (4 ชีต: `Projects`, `Units`, `Users`, `Log`)** | `https://docs.google.com/spreadsheets/d/14dTrnLc4vHRdCQuXA4kf9d2oCY_ruMchht2tkikhEPg/edit` |
| **Apps Script `scriptId`** | `1ofr77c2b0aDmXng5QdNGJJGnGPrKHgp2rLNsv7YF4CRbm6evFMCuW_qT` |
| **ลิงก์ Apps Script Editor** | `https://script.google.com/d/1ofr77c2b0aDmXng5QdNGJJGnGPrKHgp2rLNsv7YF4CRbm6evFMCuW_qT/edit` |
| **Apps Script Web App Deployment ID (`@3`)** | `AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK` |
| **Apps Script Web App `/exec` URL** | `https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec` |
| **รายชื่อ Admin ตั้งต้นในชีต `Users`** | `bddhteam@gmail.com` (BD Admin), `chanyapat@scasset.com` (พี่แนท BD Admin) |
| **จำนวนข้อมูลตั้งต้นในชีต `Units` (v1)** | 7 โครงการ · 3,714 ห้อง (`COLS` 671, `CORM9` 1,500, `COKS` 399, `RFWY` 287, `STS20` 123, `RFKS` 387, `RFS63` 347) |
| **กฎความลับ** | คอลัมน์ `M` (`sgp`) และ `O` (`sgpCost`) ห้ามส่งถึงเครื่อง `sales` ใน API ข้อมูลห้อง (`toSalesUnitRecord` ตัดทิ้งบน server เสมอ) |

---

## 🔁 Plan-relay state

- **Skill ที่ใช้**: `plan-relay-auto`
- **สถานะ relay**: `completed-waiting-auth` (2026-11-18 13:10)
- **ไฟล์แผนและผลงาน**:
  - `docs/relay/PHASE-0-PLAN.md` / `docs/relay/PHASE-0-OUTPUT.md` (Project Setup & Pure Calc Engine — 17/17 tests pass)
  - `docs/relay/PHASE-1-PLAN.md` / `docs/relay/PHASE-1-OUTPUT.md` (Excel `PriceList` Importer — 9/9 tests pass, 3,714 units)
  - `docs/relay/PHASE-2-PLAN.md` / `docs/relay/PHASE-2-OUTPUT.md` (Apps Script & Sandbox API + Role Security — 9/9 tests pass)
  - `docs/relay/PHASE-3-PLAN.md` / `docs/relay/PHASE-3-OUTPUT.md` (9-Screen 390px Mobile PWA UI + Manifest/SW)
  - `docs/relay/PHASE-4-PLAN.md` / `docs/relay/PHASE-4-OUTPUT.md` (E2E Verification + Antigravity Browser 9 Screenshots)
  - `docs/relay/PHASE-5-PLAN.md` / `docs/relay/PHASE-5-OUTPUT.md` (`chanyapat@scasset.com` Admin Seed + GitHub Pages Relative Paths + CI Workflow)
  - `docs/relay/PHASE-5B-PLAN.md` / `docs/relay/PHASE-5B-OUTPUT.md` (Production Spreadsheet ID & Web App URL Binding)

---

## ▶️ Next Step ทันทีที่รับงานต่อ

1. กดยืนยันสิทธิ์ (Review Permissions → Allow) 1 ครั้งใน Apps Script Editor (`1ofr77c2b0aDmXng5QdNGJJGnGPrKHgp2rLNsv7YF4CRbm6evFMCuW_qT`) ด้วยบัญชี `bddhteam@gmail.com`
2. ล็อกอิน GitHub บัญชี `bddhteam-lab` เพื่อสร้าง repo `bddhteam-lab/sc-price-negotiation` และ push ขึ้น GitHub Pages (หรือเลือก push ขึ้น `supakornnithi-rgb/sc-price-negotiation` ที่ล็อกอินอยู่ในเครื่องแล้ว)
