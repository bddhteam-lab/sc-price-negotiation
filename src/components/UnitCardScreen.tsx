import { formatArea, formatBaht } from '../client/formatters';
import { ProjectConfig, SalesUnitRecord, UnitRecord } from '../shared/types';

interface UnitCardScreenProps {
  unit: UnitRecord | SalesUnitRecord;
  project: ProjectConfig;
  showAdminCost: boolean;
  onBack: () => void;
  onOpenCalc: () => void;
}

function isAdminUnit(unit: UnitRecord | SalesUnitRecord): unit is UnitRecord {
  return 'sgp' in unit && 'sgpCost' in unit;
}

export function UnitCardScreen({
  unit,
  project,
  showAdminCost,
  onBack,
  onOpenCalc,
}: UnitCardScreenProps) {
  const totalTransferExpenses =
    (unit.commonFee1Y || 0) + (unit.sinkingFund || 0) + (unit.transferFee || 0);

  const statusLabel = unit.unitStatus || (unit.isBlocked ? 'ห้ามขาย' : 'พร้อมขาย');
  const statusPillClass =
    statusLabel === 'ห้ามขาย'
      ? 'status-red'
      : statusLabel === 'ยังไม่มีราคา'
      ? 'status-yellow'
      : 'status-neutral';

  const adminUnit = showAdminCost && isAdminUnit(unit) ? unit : null;

  return (
    <>
      <header className="header-orange">
        <button type="button" className="back-btn" onClick={onBack}>
          <span aria-hidden="true">‹</span>
          <span>{project.projectCode}</span>
        </button>

        <div className="header-top-row" style={{ alignItems: 'flex-end', marginTop: '4px' }}>
          <div>
            <h1
              className="mono"
              style={{ margin: 0, fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }}
            >
              {unit.unitCode}
            </h1>
            <div style={{ marginTop: '6px', fontSize: '14px' }}>
              {unit.roomCategory ?? '-'} · {formatArea(unit.areaSqm)} ตร.ม.
              {unit.building ? ` · ตึก ${unit.building}` : ''}
              {unit.floor !== undefined ? ` ชั้น ${unit.floor}` : ''}
            </div>
          </div>

          <span
            className={`status-pill ${statusPillClass}`}
            style={
              statusLabel === 'พร้อมขาย'
                ? { backgroundColor: '#FFFFFF', color: '#000000' }
                : undefined
            }
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        {unit.isBlocked && (
          <div className="alert-error">
            <strong>ไม่สามารถคำนวณต่อรองได้:</strong>{' '}
            {unit.blockReason || 'ห้องนี้ถูกระงับการใช้งานตามกฎโครงการ'}
          </div>
        )}

        {project.specialRules && (
          <div className="alert-warning">
            <strong>กฎพิเศษโครงการ {project.projectCode}:</strong> {project.specialRules}
          </div>
        )}

        <section className="sc-card">
          <h2 className="sc-card-title">ราคาตามใบราคา</h2>

          <div className="sc-row">
            <span style={{ fontSize: '15px' }}>ราคา Agent (คอม 10%)</span>
            <span className="mono" style={{ fontSize: '22px', fontWeight: 700 }}>
              {formatBaht(unit.agentNetPrice)}
            </span>
          </div>

          <div className="sc-row">
            <span style={{ fontSize: '15px' }}>ราคา SC ขายเอง</span>
            <span className="mono" style={{ fontSize: '17px', fontWeight: 600 }}>
              {formatBaht(unit.scPrice)}
            </span>
          </div>

          <div
            style={{
              marginTop: '10px',
              backgroundColor: 'var(--sc-surface-tint)',
              borderRadius: '12px',
              padding: '10px 12px',
            }}
          >
            {adminUnit ? (
              <>
                <div className="sc-row" style={{ padding: '2px 0' }}>
                  <span className="text-sm text-clay">SGP ราคาขั้นต่ำ (ช่อง M)</span>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {formatBaht(adminUnit.sgp)}
                  </span>
                </div>
                <div className="sc-row" style={{ padding: '2px 0' }}>
                  <span className="text-sm text-clay">SGP + ต้นทุนโปร (ช่อง O)</span>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {formatBaht(adminUnit.sgpCost)}
                  </span>
                </div>
              </>
            ) : (
              <div className="sc-row" style={{ padding: '2px 0' }}>
                <span className="text-sm text-clay">🔒 ราคาขั้นต่ำ (SGP)</span>
                <span className="text-sm text-clay">เห็นเฉพาะ Admin</span>
              </div>
            )}
          </div>
        </section>

        <section className="sc-card">
          <h2 className="sc-card-title">ฟรีค่าใช้จ่ายวันโอน</h2>

          <div className="sc-row">
            <span>
              ค่าส่วนกลาง 1 ปี{' '}
              <span className="text-xs text-clay">
                ({unit.commonFeeRatePerSqmMonth ?? project.commonFeeRatePerSqmMonth ?? '-'} บ./ตร.ม.)
              </span>
            </span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {formatBaht(unit.commonFee1Y)}
            </span>
          </div>

          <div className="sc-row">
            <span>
              Sinking Fund{' '}
              <span className="text-xs text-clay">
                ({unit.sinkingRatePerSqm ?? project.sinkingRatePerSqm ?? '-'} บ./ตร.ม.)
              </span>
            </span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {formatBaht(unit.sinkingFund ?? 0)}
            </span>
          </div>

          <div className="sc-row">
            <span>ค่าโอน {project.transferFeePct}%</span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {formatBaht(unit.transferFee ?? 0)}
            </span>
          </div>

          <div className="sc-divider" />

          <div className="sc-row">
            <span style={{ fontWeight: 700 }}>รวม</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: '17px' }}>
              {formatBaht(totalTransferExpenses)}
            </span>
          </div>
        </section>

        <section className="sc-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div className="text-xs text-clay">บ้านเลขที่</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px' }} className="mono">
                {unit.houseNumber || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-clay">Unit Type</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px' }} className="mono">
                {unit.unitType || '-'}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="sticky-cta-bar">
        <button
          type="button"
          className="btn-black"
          disabled={Boolean(unit.isBlocked)}
          onClick={onOpenCalc}
        >
          <span>{unit.isBlocked ? 'ห้องนี้คำนวณไม่ได้' : 'คำนวณต่อรอง'}</span>
          {!unit.isBlocked && <span aria-hidden="true">›</span>}
        </button>
      </div>
    </>
  );
}
