import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientAuth, callApi } from '../client/apiClient';
import {
  DEFAULT_COLUMN_MAPPING,
  getDefaultBlockedDecorations,
  parsePriceListWorkbook,
} from '../shared/priceListImporter';
import {
  AdminPublishUnitsData,
  ColumnMapping,
  ImportResult,
  ProjectConfig,
} from '../shared/types';

interface AdminImportScreenProps {
  targetProject?: ProjectConfig | null;
  auth: ApiClientAuth;
  onBack: () => void;
  onPublished: (summary: AdminPublishUnitsData) => void;
}

export function AdminImportScreen({
  targetProject,
  auth,
  onBack,
  onPublished,
}: AdminImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<Uint8Array | null>(null);
  const [filterByTargetProject, setFilterByTargetProject] = useState(
    Boolean(targetProject),
  );
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    ...DEFAULT_COLUMN_MAPPING,
  });
  const [blockedDecorations, setBlockedDecorations] = useState<string[] | undefined>(
    undefined,
  );
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runParse = useCallback(
    (
      buf: Uint8Array,
      mapping: ColumnMapping,
      filterProject: boolean,
      customBlocked: string[] | undefined,
    ) => {
      try {
        setErrorMsg(null);
        const res = parsePriceListWorkbook(buf, {
          projectCode:
            filterProject && targetProject
              ? targetProject.projectCode
              : undefined,
          columnMapping: mapping,
          transferFeePct: targetProject?.transferFeePct ?? 1,
          defaultSinkingRatePerSqm: targetProject?.sinkingRatePerSqm,
          defaultCommonFeeRatePerSqmMonth:
            targetProject?.commonFeeRatePerSqmMonth,
          blockedDecorations: customBlocked,
        });
        setImportResult(res);
        if (customBlocked === undefined) {
          setBlockedDecorations(
            getDefaultBlockedDecorations(
              res.report.decorations.map((d) => d.text),
            ),
          );
        }
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ Excel ได้',
        );
      }
    },
    [targetProject],
  );

  useEffect(() => {
    if (fileBuffer) {
      runParse(fileBuffer, columnMapping, filterByTargetProject, blockedDecorations);
    }
  }, [fileBuffer, filterByTargetProject, blockedDecorations, columnMapping, runParse]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    const u8 = new Uint8Array(ab);
    setFileName(file.name);
    setBlockedDecorations(undefined);
    setFileBuffer(u8);
  };

  const handleLoadSampleExcel = async () => {
    setLoadingSample(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}For_Price_Negotiation_Dashboard_revised.xlsx`,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const ab = await res.arrayBuffer();
      const u8 = new Uint8Array(ab);
      setFileName('For_Price_Negotiation_Dashboard_revised.xlsx');
      setBlockedDecorations(undefined);
      setFileBuffer(u8);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? `โหลดไฟล์ตัวอย่างไม่สำเร็จ: ${err.message}`
          : 'โหลดไฟล์ตัวอย่างไม่สำเร็จ',
      );
    } finally {
      setLoadingSample(false);
    }
  };

  const toggleDecoration = (text: string) => {
    setBlockedDecorations((prev) => {
      const current = new Set(prev ?? []);
      if (current.has(text)) {
        current.delete(text);
      } else {
        current.add(text);
      }
      return [...current];
    });
  };

  const updateCol = (key: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [key]: value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3),
    }));
  };

  const handlePublish = async () => {
    if (!importResult || importResult.units.length === 0) return;
    setPublishing(true);
    setErrorMsg(null);

    const res = await callApi<AdminPublishUnitsData>(
      'admin.publishUnits',
      {
        units: importResult.units,
        projects: importResult.projects,
        targetProjectCode:
          filterByTargetProject && targetProject
            ? targetProject.projectCode
            : undefined,
      },
      auth,
    );

    setPublishing(false);
    if (!res.ok) {
      setErrorMsg(res.errorMessage);
      return;
    }

    onPublished(res.data);
  };

  const nextVersion = (targetProject?.priceVersion ?? 0) + 1;

  return (
    <>
      <header className="header-black">
        <button type="button" className="back-btn" onClick={onBack}>
          <span aria-hidden="true">‹</span>
          <span>โครงการทั้งหมด</span>
        </button>

        <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 700 }}>
          อัปโหลดราคา · {targetProject ? targetProject.projectCode : 'ทุกโครงการ'}
        </h1>

        <div className="step-bar">
          <div>
            <div className="step-item-bar active" />
            <div className="step-item-label active">1 ตั้งค่า</div>
          </div>
          <div>
            <div className="step-item-bar active" />
            <div className="step-item-label active">2 อัปโหลดราคา</div>
          </div>
          <div>
            <div className="step-item-bar active" />
            <div className="step-item-label active">3 ตรวจ + เผยแพร่</div>
          </div>
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        {errorMsg && <div className="alert-error">{errorMsg}</div>}

        <section
          className="sc-card"
          style={{
            borderStyle: 'dashed',
            borderColor: '#b9aba0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--sc-status-green-bg)',
                color: 'var(--sc-status-green-text)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              XLS
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="mono"
                style={{ fontWeight: 700, fontSize: '14px', wordBreak: 'break-all' }}
              >
                {fileName ?? 'ยังไม่ได้เลือกไฟล์ใบราคา (.xlsx)'}
              </div>
              <div className="text-xs text-clay">
                ชีต PriceList ·{' '}
                {filterByTargetProject && targetProject
                  ? `เลือกเฉพาะแถว ${targetProject.projectCode}`
                  : 'นำเข้าทุกโครงการในไฟล์'}
              </div>
            </div>
          </div>

          {targetProject && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filterByTargetProject}
                onChange={(e) => setFilterByTargetProject(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>กรองเฉพาะแถวโครงการ {targetProject.projectCode}</span>
            </label>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '13px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              เลือกไฟล์ .xlsx
            </button>
            <button
              type="button"
              className="btn-black"
              style={{ minHeight: '44px', fontSize: '13px' }}
              disabled={loadingSample}
              onClick={() => void handleLoadSampleExcel()}
            >
              {loadingSample ? 'กำลังโหลด...' : 'โหลดไฟล์ตัวอย่างจริง (3,714 ห้อง)'}
            </button>
          </div>
        </section>

        {importResult && (
          <>
            <section className="sc-card">
              <h2 className="sc-card-title" style={{ color: 'var(--sc-black)', fontSize: '16px' }}>
                จับคู่คอลัมน์ (ระบบเดาให้ แก้ได้)
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="sc-row">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.projectCode}
                      onChange={(e) => updateCol('projectCode', e.target.value)}
                      aria-label="คอลัมน์โครงการ"
                    />
                    <span>+</span>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.unitCode}
                      onChange={(e) => updateCol('unitCode', e.target.value)}
                      aria-label="คอลัมน์รหัสห้อง"
                    />
                  </div>
                  <span className="text-sm text-clay">โครงการ + รหัสห้อง</span>
                </div>

                <div className="sc-row">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.roomCategory}
                      onChange={(e) => updateCol('roomCategory', e.target.value)}
                      aria-label="คอลัมน์แบบห้อง"
                    />
                    <span>·</span>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.areaSqm}
                      onChange={(e) => updateCol('areaSqm', e.target.value)}
                      aria-label="คอลัมน์พื้นที่"
                    />
                  </div>
                  <span className="text-sm text-clay">แบบห้อง · พื้นที่</span>
                </div>

                <div className="sc-row">
                  <input
                    className="sc-input mono"
                    style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                    value={columnMapping.sgp}
                    onChange={(e) => updateCol('sgp', e.target.value)}
                    aria-label="คอลัมน์ SGP"
                  />
                  <span className="text-sm text-clay">SGP (ราคาขั้นต่ำ)</span>
                </div>

                <div className="sc-row">
                  <input
                    className="sc-input mono"
                    style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                    value={columnMapping.sgpCost}
                    onChange={(e) => updateCol('sgpCost', e.target.value)}
                    aria-label="คอลัมน์ SGP+ต้นทุนโปร"
                  />
                  <span className="text-sm text-clay">SGP + ต้นทุนโปร</span>
                </div>

                <div className="sc-row">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.scPrice}
                      onChange={(e) => updateCol('scPrice', e.target.value)}
                      aria-label="คอลัมน์ราคา SC"
                    />
                    <span>·</span>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.agentNetPrice}
                      onChange={(e) => updateCol('agentNetPrice', e.target.value)}
                      aria-label="คอลัมน์ราคา Agent"
                    />
                  </div>
                  <span className="text-sm text-clay">ราคา SC · ราคา Agent</span>
                </div>

                <div className="sc-row">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.sinkingRatePerSqm}
                      onChange={(e) => updateCol('sinkingRatePerSqm', e.target.value)}
                      aria-label="คอลัมน์อัตรา Sinking"
                    />
                    <span>·</span>
                    <input
                      className="sc-input mono"
                      style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                      value={columnMapping.commonFeeRatePerSqmMonth}
                      onChange={(e) =>
                        updateCol('commonFeeRatePerSqmMonth', e.target.value)
                      }
                      aria-label="คอลัมน์อัตราส่วนกลาง"
                    />
                  </div>
                  <span className="text-sm text-clay">อัตรา Sinking · ส่วนกลาง</span>
                </div>

                <div className="sc-row">
                  <input
                    className="sc-input mono"
                    style={{ width: '48px', textAlign: 'center', padding: '4px' }}
                    value={columnMapping.decoration}
                    onChange={(e) => updateCol('decoration', e.target.value)}
                    aria-label="คอลัมน์ Decoration"
                  />
                  <span className="text-sm text-clay">สถานะห้อง (Decoration)</span>
                </div>
              </div>
            </section>

            {importResult.report.decorations.length > 0 && (
              <section className="sc-card">
                <h2 className="sc-card-title" style={{ color: 'var(--sc-black)', fontSize: '16px' }}>
                  เลือกสถานะห้อง (Decoration) ที่ห้ามขาย
                </h2>
                <div className="text-xs text-clay" style={{ marginBottom: '10px' }}>
                  ห้องที่ติ๊กเลือกจะถูกบล็อกปุ่มคำนวณและแสดงป้าย &quot;ห้ามขาย&quot;
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {importResult.report.decorations.map((item) => {
                    const checked = (blockedDecorations ?? []).includes(item.text);
                    return (
                      <label
                        key={item.text}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '10px',
                          backgroundColor: checked
                            ? 'var(--sc-status-red-bg)'
                            : 'var(--sc-surface-tint)',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDecoration(item.text)}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span>{item.text}</span>
                        </span>
                        <span className="mono text-xs text-clay">{item.count} ห้อง</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="sc-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 className="sc-card-title" style={{ margin: 0, color: 'var(--sc-black)', fontSize: '16px' }}>
                ผลตรวจ
              </h2>

              <div className="alert-success" style={{ fontWeight: 600 }}>
                ✓ พบ {importResult.report.importedUnitsCount.toLocaleString('en-US')} ห้อง ·
                รหัสซ้ำ {importResult.report.duplicateCount} · ไม่มี SGP{' '}
                {importResult.report.missingSgpCount}
              </div>

              {importResult.report.missingExpenseColsCount > 0 && (
                <div className="alert-warning">
                  <strong>
                    ⚠️ ค่าโอน / Sinking / ส่วนกลาง ว่าง{' '}
                    {importResult.report.missingExpenseColsCount.toLocaleString('en-US')} ห้อง
                  </strong>
                  <div style={{ marginTop: '4px' }}>
                    ระบบคำนวณให้จากอัตรา Sinking / ส่วนกลาง (U, W) และค่าโอน{' '}
                    {targetProject?.transferFeePct ?? 1}% ของช่อง O แล้ว
                  </div>
                </div>
              )}

              {importResult.report.trimmedRoomTypeCount > 0 && (
                <div className="text-sm text-clay">
                  ≡ ตัดช่องว่างท้ายชื่อแบบห้องให้{' '}
                  {importResult.report.trimmedRoomTypeCount.toLocaleString('en-US')} ห้อง
                </div>
              )}

              <div className="text-xs text-clay">
                พร้อมขาย {importResult.report.readyToSellCount.toLocaleString('en-US')} ห้อง ·
                ห้ามขาย (Decoration) {importResult.report.blockedByDecorationCount} ห้อง ·
                ยังไม่มีราคา (SGP/O=0) {importResult.report.blockedByMissingCostCount} ห้อง
              </div>
            </section>
          </>
        )}
      </main>

      {importResult && (
        <div className="sticky-cta-bar">
          <button
            type="button"
            className="btn-orange"
            disabled={publishing || importResult.units.length === 0}
            onClick={() => void handlePublish()}
          >
            {publishing
              ? 'กำลังเผยแพร่...'
              : targetProject && (targetProject.priceVersion ?? 0) === 0
              ? 'เผยแพร่ราคาชุดแรก (v1)'
              : targetProject
              ? `เผยแพร่ราคาชุดใหม่ (v${nextVersion})`
              : `เผยแพร่ราคาทุกโครงการ (${importResult.projects.length} โครงการ)`}
          </button>
          <div className="text-xs text-clay" style={{ textAlign: 'center', marginTop: '6px' }}>
            ราคาชุดเดิมเก็บไว้ดูย้อนหลังได้ · เซลเห็นราคาใหม่ทันที
          </div>
        </div>
      )}
    </>
  );
}
