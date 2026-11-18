import { useCallback, useEffect, useState } from 'react';
import { ApiClientAuth, callApi } from '../client/apiClient';
import { formatBaht, formatTimeHHmm } from '../client/formatters';
import {
  DealLogRecord,
  DealsListData,
  DealsListFilter,
  DealsRequestApprovalData,
  DealsReviewData,
} from '../shared/types';
import { BottomNav } from './BottomNav';

interface HistoryScreenProps {
  auth: ApiClientAuth;
  isAdminView: boolean;
  onNavigateHome: () => void;
}

const FILTER_TABS: Array<{ key: DealsListFilter; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รออนุมัติ' },
  { key: 'mine', label: 'ของฉัน' },
];

const MODE_LABELS: Record<DealLogRecord['mode'], string> = {
  A: 'ราคาต่ำสุด',
  B: 'คอมสูงสุด',
  C: 'เช็กดีล',
};

function getDealBadge(deal: DealLogRecord): { label: string; cls: string } {
  if (deal.approvalStatus === 'pending') {
    return { label: 'รออนุมัติ', cls: 'status-yellow' };
  }
  if (deal.approvalStatus === 'approved') {
    return { label: 'อนุมัติแล้ว', cls: 'status-green' };
  }
  if (deal.approvalStatus === 'rejected') {
    return { label: 'ไม่อนุมัติ', cls: 'status-red' };
  }
  if (deal.status === 'pass') {
    return { label: 'ผ่าน', cls: 'status-green' };
  }
  if (deal.status === 'approval') {
    return { label: 'ต้องขออนุมัติ', cls: 'status-yellow' };
  }
  return { label: 'ไม่ผ่าน', cls: 'status-red' };
}

export function HistoryScreen({
  auth,
  isAdminView,
  onNavigateHome,
}: HistoryScreenProps) {
  const [filter, setFilter] = useState<DealsListFilter>('all');
  const [deals, setDeals] = useState<DealLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await callApi<DealsListData>('deals.list', { filter }, auth);
    if (res.ok) {
      setDeals(res.data.deals);
    } else {
      setErrorMsg(res.errorMessage);
    }
    setLoading(false);
  }, [filter, auth]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const handleRequestApproval = async (dealId: string) => {
    setBusyId(dealId);
    const res = await callApi<DealsRequestApprovalData>(
      'deals.requestApproval',
      { dealId },
      auth,
    );
    setBusyId(null);
    if (res.ok) {
      await loadDeals();
    } else {
      setErrorMsg(res.errorMessage);
    }
  };

  const handleReview = async (
    dealId: string,
    decision: 'approved' | 'rejected',
  ) => {
    setBusyId(dealId);
    const res = await callApi<DealsReviewData>(
      'deals.review',
      { dealId, decision },
      auth,
    );
    setBusyId(null);
    if (res.ok) {
      await loadDeals();
    } else {
      setErrorMsg(res.errorMessage);
    }
  };

  return (
    <>
      <header className="header-orange">
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          ประวัติการต่อรอง
        </h1>

        <div className="filter-pills">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-pill ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="page-body">
        {errorMsg && <div className="alert-error">{errorMsg}</div>}

        <div className="text-xs text-clay">รายการล่าสุด · {deals.length} ดีล</div>

        {loading ? (
          <div className="sc-card text-sm text-clay">กำลังโหลดประวัติ...</div>
        ) : deals.length === 0 ? (
          <div className="sc-card text-sm text-clay">ยังไม่มีรายการในหมวดนี้</div>
        ) : (
          deals.map((deal) => {
            const badge = getDealBadge(deal);
            const remainColor =
              deal.status === 'pass'
                ? 'var(--sc-status-green-text)'
                : deal.status === 'approval'
                ? 'var(--sc-status-yellow-text)'
                : 'var(--sc-status-red-text)';
            const reasonText =
              deal.status === 'approval'
                ? `ต่ำกว่าส่วนเผื่อ ${formatBaht(deal.varianceThreshold)}`
                : deal.status === 'fail'
                ? 'ต่ำกว่าทุน'
                : '';

            return (
              <article key={deal.id} className="sc-card">
                <div className="sc-row" style={{ padding: 0 }}>
                  <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>
                    {deal.projectCode} · {deal.unitCode}
                  </div>
                  <span className={`status-pill ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="sc-row" style={{ marginTop: '6px' }}>
                  <div className="mono" style={{ fontSize: '15px' }}>
                    {formatBaht(deal.sellingPrice)} · คอม {deal.commissionPct}%
                  </div>
                  <div
                    className="mono"
                    style={{ fontWeight: 700, fontSize: '15px', color: remainColor }}
                  >
                    {deal.remainingVariance >= 0
                      ? `เหลือ ${formatBaht(deal.remainingVariance)}`
                      : `ขาด ${formatBaht(Math.abs(deal.remainingVariance))}`}
                  </div>
                </div>

                <div className="text-xs text-clay" style={{ marginTop: '4px' }}>
                  {[
                    MODE_LABELS[deal.mode],
                    reasonText,
                    deal.salesName,
                    formatTimeHHmm(deal.createdAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>

                {deal.approvedBy && (
                  <div className="text-xs text-clay" style={{ marginTop: '4px' }}>
                    ตรวจโดย {deal.approvedBy}
                  </div>
                )}

                {deal.status === 'approval' && !deal.approvalStatus && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn-orange"
                      style={{ minHeight: '44px', fontSize: '14px' }}
                      disabled={busyId === deal.id}
                      onClick={() => handleRequestApproval(deal.id)}
                    >
                      ส่งขออนุมัติ
                    </button>
                  </div>
                )}

                {isAdminView && deal.approvalStatus === 'pending' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginTop: '10px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-outline"
                      style={{
                        borderColor: 'var(--sc-status-red-text)',
                        color: 'var(--sc-status-red-text)',
                      }}
                      disabled={busyId === deal.id}
                      onClick={() => handleReview(deal.id, 'rejected')}
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      type="button"
                      className="btn-black"
                      style={{ minHeight: '44px', fontSize: '14px' }}
                      disabled={busyId === deal.id}
                      onClick={() => handleReview(deal.id, 'approved')}
                    >
                      อนุมัติ
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <BottomNav activeTab="history" onSelect={(tab) => tab === 'home' && onNavigateHome()} />
    </>
  );
}
