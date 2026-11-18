import { useEffect, useState } from 'react';
import { ApiClientAuth, callApi } from '../client/apiClient';
import { formatArea, formatBaht, parseNumericInput } from '../client/formatters';
import {
  CalcComputeData,
  CalcMode,
  CalcResult,
  DealLogRecord,
  DealsCreateData,
  ProjectConfig,
  SalesUnitRecord,
  UnitRecord,
} from '../shared/types';

interface CalculatorScreenProps {
  unit: UnitRecord | SalesUnitRecord;
  project: ProjectConfig;
  auth: ApiClientAuth;
  onBack: () => void;
  onDealSaved: (deal: DealLogRecord, actionType: 'save' | 'request_approval') => void;
}

const MODE_OPTIONS: Array<{ mode: CalcMode; title: string; subtitle: string }> = [
  { mode: 'A', title: 'ราคาต่ำสุด', subtitle: 'ใส่ค่าคอม' },
  { mode: 'B', title: 'คอมสูงสุด', subtitle: 'ใส่ราคา' },
  { mode: 'C', title: 'เช็กดีล', subtitle: 'ใส่ทั้งคู่' },
];

export function CalculatorScreen({
  unit,
  project,
  auth,
  onBack,
  onDealSaved,
}: CalculatorScreenProps) {
  const [mode, setMode] = useState<CalcMode>('A');
  const [commissionPctStr, setCommissionPctStr] = useState('2');
  const [sellingPriceStr, setSellingPriceStr] = useState(
    unit.scPrice ? String(Math.round(unit.scPrice)) : '2500000',
  );
  const [extraPromoStr, setExtraPromoStr] = useState('0');
  const [freeCommonYears, setFreeCommonYears] = useState(0);
  const [varianceStr, setVarianceStr] = useState(
    String(project.defaultVariance ?? 50000),
  );

  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const commissionPct = parseNumericInput(commissionPctStr);
  const sellingPrice = parseNumericInput(sellingPriceStr);
  const extraPromo = parseNumericInput(extraPromoStr);
  const variance = parseNumericInput(varianceStr);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setComputing(true);
      const res = await callApi<CalcComputeData>(
        'calc.compute',
        {
          projectCode: project.projectCode,
          unitCode: unit.unitCode,
          mode,
          commissionPct: mode === 'B' ? undefined : commissionPct,
          sellingPrice: mode === 'A' ? undefined : sellingPrice,
          freeCommonYears,
          extraPromo,
          variance,
        },
        auth,
      );
      if (!cancelled) {
        if (res.ok) {
          setCalcResult(res.data.result);
        } else {
          setCalcResult({
            ok: false,
            errorCode: 'INVALID_INPUT',
            errorMessage: res.errorMessage,
          });
        }
        setComputing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    project.projectCode,
    unit.unitCode,
    mode,
    commissionPct,
    sellingPrice,
    freeCommonYears,
    extraPromo,
    variance,
    auth,
  ]);

  const handleSaveDeal = async (actionType: 'save' | 'request_approval') => {
    setSaving(true);
    setFeedback(null);
    const res = await callApi<DealsCreateData>(
      'deals.create',
      {
        projectCode: project.projectCode,
        unitCode: unit.unitCode,
        mode,
        commissionPct: mode === 'B' ? undefined : commissionPct,
        sellingPrice: mode === 'A' ? undefined : sellingPrice,
        freeCommonYears,
        extraPromo,
        variance,
        actionType,
      },
      auth,
    );
    setSaving(false);

    if (!res.ok) {
      setFeedback({ type: 'error', text: res.errorMessage });
      return;
    }

    onDealSaved(res.data.deal, actionType);
  };

  const successRes = calcResult && calcResult.ok ? calcResult : null;
  const statusTone =
    successRes?.status === 'pass'
      ? {
          bg: 'var(--sc-status-green-bg)',
          fg: 'var(--sc-status-green-text)',
          pillText: 'ผ่าน · ขายได้',
        }
      : successRes?.status === 'approval'
      ? {
          bg: 'var(--sc-status-yellow-bg)',
          fg: 'var(--sc-status-yellow-text)',
          pillText: 'ต้องขออนุมัติ',
        }
      : {
          bg: 'var(--sc-status-red-bg)',
          fg: 'var(--sc-status-red-text)',
          pillText: 'ไม่ผ่าน',
        };

  return (
    <>
      <header className="header-orange">
        <button type="button" className="back-btn" onClick={onBack}>
          <span aria-hidden="true">‹</span>
          <span>ข้อมูลห้อง</span>
        </button>

        <div className="header-top-row" style={{ marginTop: '4px' }}>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>
            {project.projectCode} · {unit.unitCode}
          </div>
          <div className="text-sm">
            {unit.roomCategory ?? '-'} · {formatArea(unit.areaSqm)} ตร.ม.
          </div>
        </div>

        <div style={{ marginTop: '4px', fontSize: '13px' }}>
          ราคา Agent (คอม 10%) {formatBaht(unit.agentNetPrice)}
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        <div>
          <div className="text-sm text-clay" style={{ marginBottom: '6px', fontWeight: 600 }}>
            อยากรู้อะไร
          </div>
          <div className="mode-tabs" role="tablist" aria-label="โหมดคำนวณ">
            {MODE_OPTIONS.map((opt) => {
              const isActive = mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`mode-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setMode(opt.mode)}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{opt.title}</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>{opt.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="sc-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(mode === 'B' || mode === 'C') && (
            <div>
              <label
                htmlFor="calc-selling-price"
                style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}
              >
                ราคาที่จะขาย (บาท)
              </label>
              <input
                id="calc-selling-price"
                type="number"
                inputMode="numeric"
                className="sc-input sc-input-lg"
                value={sellingPriceStr}
                onChange={(e) => setSellingPriceStr(e.target.value)}
              />
            </div>
          )}

          {(mode === 'A' || mode === 'C') && (
            <div>
              <label
                htmlFor="calc-com-pct"
                style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}
              >
                ค่าคอม Agent (%)
              </label>
              <input
                id="calc-com-pct"
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                className="sc-input sc-input-lg"
                value={commissionPctStr}
                onChange={(e) => setCommissionPctStr(e.target.value)}
              />
              <div className="text-xs text-clay" style={{ marginTop: '4px' }}>
                ใส่ค่าคอมที่บอก Agent ระบบบวก VAT {project.vatPct}% และค่า K ×{project.kFactor} ให้เอง
              </div>
            </div>
          )}

          <div className="sc-row">
            <label htmlFor="calc-extra-promo" style={{ fontSize: '14px', fontWeight: 600 }}>
              โปรเพิ่มเติม (บาท)
            </label>
            <input
              id="calc-extra-promo"
              type="number"
              min="0"
              inputMode="numeric"
              className="sc-input mono"
              style={{ width: '150px', textAlign: 'right', fontWeight: 600 }}
              value={extraPromoStr}
              onChange={(e) => setExtraPromoStr(e.target.value)}
            />
          </div>

          <div className="sc-row">
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>ฟรีส่วนกลางเพิ่ม</div>
              <div className="text-xs text-clay">
                ปีละ {formatBaht(unit.commonFee1Y)} ·{' '}
                {project.status === 'Ready to move'
                  ? 'ปีแรกรวมในต้นทุนแล้ว*'
                  : 'โครงการกำลังก่อสร้าง'}
              </div>
            </div>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setFreeCommonYears((y) => Math.max(0, y - 1))}
                aria-label="ลดปีฟรีส่วนกลาง"
              >
                −
              </button>
              <span className="stepper-value mono">{freeCommonYears} ปี</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setFreeCommonYears((y) => y + 1)}
                aria-label="เพิ่มปีฟรีส่วนกลาง"
              >
                +
              </button>
            </div>
          </div>

          <div className="sc-row">
            <div>
              <label htmlFor="calc-variance" style={{ fontSize: '14px', fontWeight: 600 }}>
                ส่วนเผื่อ (Variance)
              </label>
              <div className="text-xs text-clay">เงินกันไว้ต่อรองได้อีก</div>
            </div>
            <input
              id="calc-variance"
              type="number"
              min="0"
              inputMode="numeric"
              className="sc-input mono"
              style={{ width: '150px', textAlign: 'right', fontWeight: 600 }}
              value={varianceStr}
              onChange={(e) => setVarianceStr(e.target.value)}
            />
          </div>

          <div className="text-xs text-clay" style={{ lineHeight: 1.4 }}>
            * โครงการ Ready to move รวมฟรีส่วนกลางปีแรกไว้ในต้นทุน (ช่อง O) แล้ว ·
            ใส่เฉพาะปีที่ลูกค้าขอเพิ่ม
          </div>
        </section>

        {calcResult && !calcResult.ok && (
          <div className="alert-error">{calcResult.errorMessage}</div>
        )}

        {successRes && (
          <>
            <section
              className="sc-card"
              style={{
                backgroundColor: statusTone.bg,
                borderColor: 'transparent',
                color: statusTone.fg,
              }}
            >
              {mode === 'A' && (
                <>
                  <div className="text-sm" style={{ fontWeight: 600 }}>
                    ขายได้ต่ำสุด (ปัดขึ้นทีละ{' '}
                    {project.priceRoundStep === 10000
                      ? 'หมื่น'
                      : formatBaht(project.priceRoundStep)}
                    )
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '30px', fontWeight: 700, marginTop: '4px' }}
                  >
                    {formatBaht(successRes.sellingPrice)} บาท
                  </div>
                  {successRes.diffFromAgentPrice !== undefined && (
                    <div className="text-sm" style={{ marginTop: '4px' }}>
                      {successRes.diffFromAgentPrice >= 0
                        ? `ต่ำกว่าราคา Agent ${formatBaht(successRes.diffFromAgentPrice)} บาท (${successRes.diffFromAgentPct?.toFixed(1)}%)`
                        : `สูงกว่าราคา Agent ${formatBaht(Math.abs(successRes.diffFromAgentPrice))} บาท`}
                    </div>
                  )}
                </>
              )}

              {mode === 'B' && (
                <>
                  <div className="text-sm" style={{ fontWeight: 600 }}>
                    ให้คอม Agent ได้สูงสุด
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '34px', fontWeight: 700, marginTop: '4px' }}
                  >
                    {successRes.effectiveCommissionPct}%
                  </div>
                  <div className="text-sm" style={{ marginTop: '4px' }}>
                    เพดานรวม VAT + ค่า K {successRes.ceilingPct?.toFixed(2)}% · คอม{' '}
                    {successRes.nextStepComPct}% ={' '}
                    {successRes.nextStepActualCostPct?.toFixed(2)}% เกินเพดาน
                  </div>
                </>
              )}

              {mode === 'C' && (
                <>
                  <div className="text-sm" style={{ fontWeight: 600 }}>
                    ผลเช็กดีลนี้
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
                    {successRes.status === 'pass'
                      ? 'ขายได้'
                      : successRes.status === 'approval'
                      ? 'ต้องขออนุมัติ'
                      : 'ไม่ผ่าน'}
                  </div>
                  <div className="text-sm" style={{ marginTop: '4px' }}>
                    {successRes.remainingVariance >= 0
                      ? `เหลือส่วนเผื่อ ${formatBaht(successRes.remainingVariance)} บาท จากที่ตั้งไว้ ${formatBaht(successRes.varianceThreshold)}`
                      : `ขาด ${formatBaht(Math.abs(successRes.remainingVariance))} บาท (ต่ำกว่าต้นทุน)`}
                  </div>
                </>
              )}

              <div style={{ marginTop: '12px' }}>
                <span
                  className="status-pill"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: statusTone.fg,
                  }}
                >
                  {statusTone.pillText}
                </span>
                {computing && (
                  <span className="text-xs" style={{ marginLeft: '8px', opacity: 0.8 }}>
                    กำลังอัปเดต...
                  </span>
                )}
              </div>
            </section>

            <section className="sc-card">
              <h2 className="sc-card-title" style={{ color: 'var(--sc-black)', fontSize: '16px' }}>
                ที่มาของตัวเลข
              </h2>

              <div className="sc-row">
                <div>
                  <div>ราคาขาย</div>
                  <div className="text-xs text-clay">
                    {mode === 'A' ? 'ระบบหาให้' : 'ที่กรอก'}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 700 }}>
                  {formatBaht(successRes.breakdown.sellingPrice)}
                </div>
              </div>

              <div className="sc-row">
                <div>
                  <div>
                    หัก ค่าคอม {successRes.breakdown.commissionPct}% (={' '}
                    {successRes.breakdown.effectiveComRatePct.toFixed(2)}%)
                  </div>
                  <div className="text-xs text-clay">
                    รวม VAT {project.vatPct}% และค่า K ×{project.kFactor}
                  </div>
                </div>
                <div className="mono">
                  −{formatBaht(successRes.breakdown.commissionAmount)}
                </div>
              </div>

              <div className="sc-row">
                <div>
                  <div>หัก SGP + ต้นทุนโปร</div>
                  <div className="text-xs text-clay">จากใบราคา (ช่อง O)</div>
                </div>
                <div className="mono">
                  −{formatBaht(successRes.breakdown.sgpPlusCost)}
                </div>
              </div>

              <div className="sc-row">
                <div>
                  <div>หัก ฟรีส่วนกลางเพิ่ม {successRes.breakdown.freeCommonYears} ปี</div>
                  <div className="text-xs text-clay">ที่เลือก</div>
                </div>
                <div className="mono">
                  −{formatBaht(successRes.breakdown.freeCommonAmount)}
                </div>
              </div>

              <div className="sc-row">
                <div>
                  <div>หัก โปรเพิ่มเติม</div>
                  <div className="text-xs text-clay">ที่กรอก</div>
                </div>
                <div className="mono">
                  −{formatBaht(successRes.breakdown.extraPromoAmount)}
                </div>
              </div>

              <div className="sc-divider" />

              <div className="sc-row">
                <div style={{ fontWeight: 700 }}>เหลือเป็นส่วนเผื่อ</div>
                <div
                  className="mono"
                  style={{ fontWeight: 700, fontSize: '17px', color: statusTone.fg }}
                >
                  {successRes.breakdown.remainingVariance < 0 ? '−' : ''}
                  {formatBaht(Math.abs(successRes.breakdown.remainingVariance))}
                </div>
              </div>

              <div className="text-xs text-clay" style={{ marginTop: '4px' }}>
                ต้องไม่ติดลบ · ถ้าต่ำกว่าส่วนเผื่อที่ตั้งไว้ ต้องขออนุมัติ
              </div>
            </section>
          </>
        )}

        {feedback && (
          <div className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}>
            {feedback.text}
          </div>
        )}
      </main>

      <div
        className="sticky-cta-bar"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
      >
        <button
          type="button"
          className="btn-outline"
          disabled={saving || !successRes}
          style={{ minHeight: '48px' }}
          onClick={() => handleSaveDeal('save')}
        >
          บันทึกดีล
        </button>
        <button
          type="button"
          className="btn-black"
          disabled={saving || !successRes}
          style={{ minHeight: '48px', fontSize: '15px' }}
          onClick={() => handleSaveDeal('request_approval')}
        >
          ส่งขออนุมัติ
        </button>
      </div>
    </>
  );
}
