import { useState } from 'react';
import { ApiClientAuth, callApi } from '../client/apiClient';
import {
  AdminUpsertProjectData,
  DEFAULT_PROJECT_CONFIG_VALUES,
  ProjectConfig,
  ProjectStatus,
} from '../shared/types';

interface AdminProjectFormScreenProps {
  initialProject?: ProjectConfig | null;
  auth: ApiClientAuth;
  onBack: () => void;
  onSaved: (
    project: ProjectConfig,
    goToImport: boolean,
    warningMessage?: string,
  ) => void;
}

export function AdminProjectFormScreen({
  initialProject,
  auth,
  onBack,
  onSaved,
}: AdminProjectFormScreenProps) {
  const isEditing = Boolean(initialProject);

  const [projectCode, setProjectCode] = useState(
    initialProject?.projectCode ?? '',
  );
  const [projectName, setProjectName] = useState(
    initialProject?.projectName ?? '',
  );
  const [status, setStatus] = useState<ProjectStatus>(
    initialProject?.status ?? 'กำลังก่อสร้าง',
  );
  const [sinkingRate, setSinkingRate] = useState(
    String(initialProject?.sinkingRatePerSqm ?? 500),
  );
  const [commonRate, setCommonRate] = useState(
    String(initialProject?.commonFeeRatePerSqmMonth ?? 55),
  );
  const [transferFeePct, setTransferFeePct] = useState(
    String(
      initialProject?.transferFeePct ??
        DEFAULT_PROJECT_CONFIG_VALUES.transferFeePct,
    ),
  );
  const [defaultVariance, setDefaultVariance] = useState(
    String(
      initialProject?.defaultVariance ??
        DEFAULT_PROJECT_CONFIG_VALUES.defaultVariance,
    ),
  );
  const [kFactor, setKFactor] = useState(
    String(initialProject?.kFactor ?? DEFAULT_PROJECT_CONFIG_VALUES.kFactor),
  );
  const [priceRoundStep, setPriceRoundStep] = useState(
    String(
      initialProject?.priceRoundStep ??
        DEFAULT_PROJECT_CONFIG_VALUES.priceRoundStep,
    ),
  );
  const [comStepPct, setComStepPct] = useState(
    String(
      initialProject?.comStepPct ?? DEFAULT_PROJECT_CONFIG_VALUES.comStepPct,
    ),
  );
  const [vatPct, setVatPct] = useState(
    String(initialProject?.vatPct ?? DEFAULT_PROJECT_CONFIG_VALUES.vatPct),
  );
  const [specialRules, setSpecialRules] = useState(
    initialProject?.specialRules ?? '',
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (goToImport: boolean) => {
    const code = projectCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('กรุณาระบุรหัสโครงการ');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const res = await callApi<AdminUpsertProjectData>(
      'admin.upsertProject',
      {
        project: {
          projectCode: code,
          projectName: projectName.trim() || code,
          status,
          sinkingRatePerSqm: Number(sinkingRate) || 500,
          commonFeeRatePerSqmMonth: Number(commonRate) || 55,
          transferFeePct: Number(transferFeePct) || 1,
          defaultVariance: Number(defaultVariance) || 50000,
          kFactor: Number(kFactor) || 1.046,
          priceRoundStep: Number(priceRoundStep) || 10000,
          comStepPct: Number(comStepPct) || 1,
          vatPct: Number(vatPct) || 7,
          specialRules: specialRules.trim(),
        },
      },
      auth,
    );

    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.errorMessage);
      return;
    }

    onSaved(
      res.data.project,
      goToImport,
      res.data.readyToMoveWarning ? res.data.warningMessage : undefined,
    );
  };

  return (
    <>
      <header className="header-black">
        <button type="button" className="back-btn" onClick={onBack}>
          <span aria-hidden="true">‹</span>
          <span>โครงการทั้งหมด</span>
        </button>

        <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 700 }}>
          {isEditing ? `ตั้งค่าโครงการ · ${initialProject?.projectCode}` : 'เพิ่มโครงการ'}
        </h1>

        <div className="step-bar">
          <div>
            <div className="step-item-bar active" />
            <div className="step-item-label active">1 ตั้งค่า</div>
          </div>
          <div>
            <div className="step-item-bar" />
            <div className="step-item-label">2 อัปโหลดราคา</div>
          </div>
          <div>
            <div className="step-item-bar" />
            <div className="step-item-label">3 ตรวจ + เผยแพร่</div>
          </div>
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        {errorMsg && <div className="alert-error">{errorMsg}</div>}

        <section className="sc-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 className="sc-card-title" style={{ margin: 0, color: 'var(--sc-black)', fontSize: '16px' }}>
            ข้อมูลโครงการ
          </h2>

          <div>
            <label htmlFor="proj-code" className="text-sm" style={{ display: 'block', marginBottom: '4px' }}>
              รหัสโครงการ <span className="text-clay">(ใช้ต่อหน้ารหัสห้อง)</span>
            </label>
            <input
              id="proj-code"
              type="text"
              className="sc-input mono"
              placeholder="เช่น CORM9"
              value={projectCode}
              disabled={isEditing}
              onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label htmlFor="proj-name" className="text-sm" style={{ display: 'block', marginBottom: '4px' }}>
              ชื่อโครงการ
            </label>
            <input
              id="proj-name"
              type="text"
              className="sc-input"
              placeholder="[ชื่อโครงการ]"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm" style={{ marginBottom: '6px' }}>สถานะโครงการ</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: 'var(--sc-sand)',
                padding: '4px',
                borderRadius: '14px',
              }}
            >
              <button
                type="button"
                style={{
                  minHeight: '46px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  backgroundColor:
                    status === 'กำลังก่อสร้าง' ? 'var(--sc-black)' : 'transparent',
                  color: status === 'กำลังก่อสร้าง' ? '#FFFFFF' : 'var(--sc-black)',
                }}
                onClick={() => setStatus('กำลังก่อสร้าง')}
              >
                กำลังก่อสร้าง
              </button>
              <button
                type="button"
                style={{
                  minHeight: '46px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  backgroundColor:
                    status === 'Ready to move' ? 'var(--sc-black)' : 'transparent',
                  color: status === 'Ready to move' ? '#FFFFFF' : 'var(--sc-black)',
                }}
                onClick={() => setStatus('Ready to move')}
              >
                Ready to move
              </button>
            </div>

            {status === 'Ready to move' ? (
              <div className="alert-warning" style={{ marginTop: '8px' }}>
                <strong>Ready to move:</strong> ต้นทุน (ช่อง O) ต้องรวมฟรีส่วนกลางปีแรกแล้ว ·
                เปลี่ยนสถานะเมื่อสร้างเสร็จ ระบบจะเตือนให้อัปเดตต้นทุน
              </div>
            ) : (
              <div className="text-xs text-clay" style={{ marginTop: '6px' }}>
                Ready to move: ต้นทุน (ช่อง O) ต้องรวมฟรีส่วนกลางปีแรกแล้ว · เปลี่ยนสถานะเมื่อสร้างเสร็จ ระบบจะเตือนให้อัปเดตต้นทุน
              </div>
            )}
          </div>
        </section>

        <section className="sc-card">
          <h2 className="sc-card-title" style={{ marginBottom: '4px', color: 'var(--sc-black)', fontSize: '16px' }}>
            ค่าตั้งต้นของโครงการ
          </h2>
          <div className="text-xs text-clay" style={{ marginBottom: '12px' }}>
            ห้องไหนมีค่าเฉพาะในไฟล์ราคา ระบบใช้ค่าของห้องนั้นแทน
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label htmlFor="cfg-sinking" className="text-xs">Sinking (บ./ตร.ม.)</label>
              <input
                id="cfg-sinking"
                type="number"
                className="sc-input mono"
                value={sinkingRate}
                onChange={(e) => setSinkingRate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-common" className="text-xs">ส่วนกลาง (บ./ตร.ม./ด.)</label>
              <input
                id="cfg-common"
                type="number"
                className="sc-input mono"
                value={commonRate}
                onChange={(e) => setCommonRate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-transfer" className="text-xs">ค่าโอน (%)</label>
              <input
                id="cfg-transfer"
                type="number"
                step="0.1"
                className="sc-input mono"
                value={transferFeePct}
                onChange={(e) => setTransferFeePct(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-variance" className="text-xs">ส่วนเผื่อเริ่มต้น (บาท)</label>
              <input
                id="cfg-variance"
                type="number"
                className="sc-input mono"
                value={defaultVariance}
                onChange={(e) => setDefaultVariance(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-k" className="text-xs">ค่า K (เผื่อ corporate)</label>
              <input
                id="cfg-k"
                type="number"
                step="0.001"
                className="sc-input mono"
                value={kFactor}
                onChange={(e) => setKFactor(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-round" className="text-xs">ปัดราคาขึ้นทีละ</label>
              <input
                id="cfg-round"
                type="number"
                className="sc-input mono"
                value={priceRoundStep}
                onChange={(e) => setPriceRoundStep(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-comstep" className="text-xs">ขั้นค่าคอมที่ให้ได้ (%)</label>
              <input
                id="cfg-comstep"
                type="number"
                step="0.5"
                className="sc-input mono"
                value={comStepPct}
                onChange={(e) => setComStepPct(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cfg-vat" className="text-xs">VAT ค่าคอม (%)</label>
              <input
                id="cfg-vat"
                type="number"
                step="0.5"
                className="sc-input mono"
                value={vatPct}
                onChange={(e) => setVatPct(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="sc-card">
          <h2 className="sc-card-title" style={{ color: 'var(--sc-black)', fontSize: '16px' }}>
            กฎพิเศษของโครงการ
          </h2>
          <textarea
            className="sc-textarea"
            placeholder="[ถ้ามี เช่น ห้องที่ห้ามใช้สูตรนี้ เช่น ห้ามขาย SHOP1]"
            value={specialRules}
            onChange={(e) => setSpecialRules(e.target.value)}
          />
          <div className="text-xs text-clay" style={{ marginTop: '6px' }}>
            ระบบจะเตือนเซลอัตโนมัติเมื่อเปิดห้องที่เข้าเงื่อนไข
          </div>
        </section>
      </main>

      <div
        className="sticky-cta-bar"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px' }}
      >
        <button
          type="button"
          className="btn-outline"
          disabled={saving}
          onClick={() => void handleSave(false)}
        >
          บันทึกโครงการ
        </button>
        <button
          type="button"
          className="btn-orange"
          style={{ minHeight: '48px', fontSize: '14px' }}
          disabled={saving}
          onClick={() => void handleSave(true)}
        >
          บันทึกและอัปโหลดราคา ›
        </button>
      </div>
    </>
  );
}
