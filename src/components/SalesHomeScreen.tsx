import { useEffect, useState } from 'react';
import { callApi, ApiClientAuth } from '../client/apiClient';
import { formatArea, formatBaht } from '../client/formatters';
import {
  ProjectConfig,
  SalesUnitRecord,
  UnitRecord,
  UnitsSearchData,
  UserRecord,
} from '../shared/types';
import { BottomNav } from './BottomNav';

interface SalesHomeScreenProps {
  user: UserRecord;
  auth: ApiClientAuth;
  projects: ProjectConfig[];
  totalUnitCount: number;
  recentUnits: Array<UnitRecord | SalesUnitRecord>;
  onSelectUnit: (projectCode: string, unitCode: string) => void;
  onNavigateHistory: () => void;
  onSwitchToAdmin?: () => void;
  onNavigateAddProject?: () => void;
  onLogout: () => void;
}

export function SalesHomeScreen({
  user,
  auth,
  projects,
  totalUnitCount,
  recentUnits,
  onSelectUnit,
  onNavigateHistory,
  onSwitchToAdmin,
  onNavigateAddProject,
  onLogout,
}: SalesHomeScreenProps) {
  const [query, setQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<UnitRecord | SalesUnitRecord>>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  const showResults = query.trim().length > 0 || selectedProject !== null;

  useEffect(() => {
    if (!showResults) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const res = await callApi<UnitsSearchData>(
        'units.search',
        {
          projectCode: selectedProject ?? undefined,
          query: query.trim() || undefined,
          limit: 40,
          includeBlocked: true,
        },
        auth,
      );
      if (!cancelled) {
        if (res.ok) {
          setSearchResults(res.data.units);
          setSearchTotal(res.data.total);
        }
        setSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selectedProject, showResults, auth]);

  const toggleProject = (projectCode: string) => {
    setSelectedProject((prev) => (prev === projectCode ? null : projectCode));
  };

  return (
    <>
      <header className="header-orange">
        <div className="header-top-row">
          <div className="brand-lockup">
            <img
              src={`${import.meta.env.BASE_URL}sc-logo.png`}
              alt="SC Asset"
              className="brand-logo"
            />
            <div className="brand-divider" />
            <div>
              <div className="brand-title">ต่อรองราคา</div>
              <div className="brand-subtitle">BD Team</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {user.role === 'admin' && onSwitchToAdmin ? (
              <button
                type="button"
                className="role-pill"
                onClick={onSwitchToAdmin}
                title="สลับไปหน้า Admin"
              >
                เซล · สลับ Admin
              </button>
            ) : (
              <button
                type="button"
                className="role-pill"
                onClick={onLogout}
                title="สลับบัญชี"
              >
                เซล
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 500 }}>
          ค้นหาห้องจากทุกโครงการ
        </div>

        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#574946" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="พิมพ์รหัสห้อง เช่น B0407"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="ค้นหารหัสห้อง"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ minWidth: '44px', fontSize: '16px', color: 'var(--sc-text-clay)' }}
              aria-label="ล้างคำค้นหา"
            >
              ×
            </button>
          )}
        </div>
      </header>

      <main className="page-body">
        <section>
          <div className="sc-row" style={{ marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>โครงการ</h2>
            <span className="text-sm text-clay tabular-nums">
              {projects.length} โครงการ · {totalUnitCount.toLocaleString('en-US')} ห้อง
            </span>
          </div>

          <div className="project-grid">
            {projects.map((proj) => {
              const isSelected = selectedProject === proj.projectCode;
              return (
                <button
                  key={proj.projectCode}
                  type="button"
                  className={`project-tile ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleProject(proj.projectCode)}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700 }} className="mono">
                    {proj.projectCode}
                  </span>
                  <span className="text-sm text-clay tabular-nums">
                    {(proj.unitCount ?? 0).toLocaleString('en-US')} ห้อง
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              className="project-tile project-tile-dashed"
              onClick={() => {
                if (user.role === 'admin' && onNavigateAddProject) {
                  onNavigateAddProject();
                } else if (selectedProject) {
                  setSelectedProject(null);
                }
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 600 }}>+</span>
              <span style={{ textAlign: 'left', lineHeight: 1.3 }}>
                โครงการใหม่ขึ้นที่นี่ทันทีที่ Admin เพิ่ม
              </span>
            </button>
          </div>
        </section>

        {showResults && (
          <section>
            <div className="sc-row" style={{ marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {selectedProject ? `ห้องใน ${selectedProject}` : 'ผลการค้นหา'}
                {!searching ? ` (${searchTotal.toLocaleString('en-US')})` : ''}
              </h2>
              {selectedProject && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => setSelectedProject(null)}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="sc-card" style={{ padding: '6px 14px' }}>
              {searching ? (
                <div className="text-sm text-clay" style={{ padding: '14px 0', textAlign: 'center' }}>
                  กำลังค้นหาห้อง...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-sm text-clay" style={{ padding: '14px 0', textAlign: 'center' }}>
                  ไม่พบห้องที่ตรงกับเงื่อนไข
                </div>
              ) : (
                searchResults.map((unit, idx) => (
                  <div key={unit.id}>
                    {idx > 0 && <div className="sc-divider" style={{ margin: 0 }} />}
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '10px 0',
                        textAlign: 'left',
                      }}
                      onClick={() => onSelectUnit(unit.projectCode, unit.unitCode)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }} className="mono">
                          {unit.projectCode} · {unit.unitCode}
                        </div>
                        <div className="text-xs text-clay">
                          {unit.roomCategory ?? unit.unitType ?? '-'} · {formatArea(unit.areaSqm)} ตร.ม.
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px' }} className="mono">
                          {formatBaht(unit.agentNetPrice)}
                        </div>
                        {unit.isBlocked && (
                          <span
                            className={`status-pill ${
                              unit.unitStatus === 'ห้ามขาย' ? 'status-red' : 'status-yellow'
                            }`}
                            style={{ marginTop: '2px' }}
                          >
                            {unit.unitStatus ?? 'ห้ามขาย'}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section>
          <div className="sc-row" style={{ marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>ดูล่าสุด</h2>
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-clay"
              style={{ padding: '6px 8px' }}
            >
              {user.email} · ออกจากระบบ
            </button>
          </div>

          <div className="sc-card" style={{ padding: '6px 14px' }}>
            {recentUnits.length === 0 ? (
              <div className="text-sm text-clay" style={{ padding: '12px 0' }}>
                ยังไม่มีห้องที่เปิดดูล่าสุด
              </div>
            ) : (
              recentUnits.map((unit, idx) => (
                <div key={unit.id}>
                  {idx > 0 && <div className="sc-divider" style={{ margin: 0 }} />}
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      textAlign: 'left',
                    }}
                    onClick={() => onSelectUnit(unit.projectCode, unit.unitCode)}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }} className="mono">
                        {unit.projectCode} · {unit.unitCode}
                      </div>
                      <div className="text-xs text-clay">
                        {unit.roomCategory ?? unit.unitType ?? '-'} · {formatArea(unit.areaSqm)} ตร.ม.
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '16px' }} className="mono">
                      {formatBaht(unit.agentNetPrice)}
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <BottomNav activeTab="home" onSelect={(tab) => tab === 'history' && onNavigateHistory()} />
    </>
  );
}
