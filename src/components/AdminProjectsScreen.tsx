import { useCallback, useEffect, useState } from 'react';
import { ApiClientAuth, callApi } from '../client/apiClient';
import { formatBaht } from '../client/formatters';
import {
  AdminGetProjectVersionsData,
  AdminUsersDeleteData,
  AdminUsersListData,
  AdminUsersUpsertData,
  ProjectConfig,
  UnitRecord,
  UserRecord,
  UserRole,
} from '../shared/types';

interface AdminProjectsScreenProps {
  user: UserRecord;
  auth: ApiClientAuth;
  projects: ProjectConfig[];
  totalUnitCount: number;
  onSwitchToSales: () => void;
  onOpenApprovalHistory: () => void;
  onAddProject: () => void;
  onEditProject: (project: ProjectConfig) => void;
  onImportForProject: (project: ProjectConfig) => void;
  onLogout: () => void;
}

export function AdminProjectsScreen({
  user,
  auth,
  projects,
  totalUnitCount,
  onSwitchToSales,
  onOpenApprovalHistory,
  onAddProject,
  onEditProject,
  onImportForProject,
  onLogout,
}: AdminProjectsScreenProps) {
  const [tab, setTab] = useState<'projects' | 'users'>('projects');

  // Users management state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sales');
  const [savingUser, setSavingUser] = useState(false);

  // Price version history modal state
  const [versionModalData, setVersionModalData] =
    useState<AdminGetProjectVersionsData | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionQuery, setVersionQuery] = useState('');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const res = await callApi<AdminUsersListData>('admin.users.list', {}, auth);
    if (res.ok) {
      setUsers(res.data.users);
    } else {
      setUsersError(res.errorMessage);
    }
    setUsersLoading(false);
  }, [auth]);

  useEffect(() => {
    if (tab === 'users') {
      void loadUsers();
    }
  }, [tab, loadUsers]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      setUsersError('กรุณากรอก Email และชื่อผู้ใช้');
      return;
    }
    setSavingUser(true);
    setUsersError(null);
    const res = await callApi<AdminUsersUpsertData>(
      'admin.users.upsert',
      {
        user: {
          email: newEmail.trim().toLowerCase(),
          name: newName.trim(),
          role: newRole,
          active: true,
        },
      },
      auth,
    );
    setSavingUser(false);
    if (!res.ok) {
      setUsersError(res.errorMessage);
      return;
    }
    setNewEmail('');
    setNewName('');
    await loadUsers();
  };

  const handleToggleRole = async (target: UserRecord) => {
    setUsersError(null);
    const nextRole: UserRole = target.role === 'admin' ? 'sales' : 'admin';
    const res = await callApi<AdminUsersUpsertData>(
      'admin.users.upsert',
      {
        user: {
          ...target,
          role: nextRole,
        },
      },
      auth,
    );
    if (!res.ok) {
      setUsersError(res.errorMessage);
      return;
    }
    await loadUsers();
  };

  const handleDeleteUser = async (email: string) => {
    setUsersError(null);
    const res = await callApi<AdminUsersDeleteData>(
      'admin.users.delete',
      { email },
      auth,
    );
    if (!res.ok) {
      setUsersError(res.errorMessage);
      return;
    }
    await loadUsers();
  };

  const openVersionHistory = async (projectCode: string, version?: number) => {
    setVersionLoading(true);
    setVersionError(null);
    if (!version) setVersionQuery('');
    const res = await callApi<AdminGetProjectVersionsData>(
      'admin.getProjectVersions',
      { projectCode, version },
      auth,
    );
    setVersionLoading(false);
    if (res.ok) {
      setVersionModalData(res.data);
    } else {
      setVersionError(res.errorMessage);
    }
  };

  const filteredVersionUnits: UnitRecord[] = versionModalData
    ? versionModalData.units
        .filter((u) => {
          const q = versionQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            u.unitCode.toLowerCase().includes(q) ||
            (u.roomCategory?.toLowerCase().includes(q) ?? false)
          );
        })
        .slice(0, 60)
    : [];

  return (
    <>
      <header className="header-black">
        <div className="header-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="admin-badge">ADMIN</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {user.email}
            </span>
          </div>
          <button
            type="button"
            className="role-pill role-pill-dark"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={onSwitchToSales}
          >
            สลับไปหน้าเซล
          </button>
        </div>

        <h1 style={{ margin: '14px 0 4px', fontSize: '26px', fontWeight: 700 }}>
          {tab === 'projects' ? 'โครงการทั้งหมด' : 'จัดการผู้ใช้ (Users)'}
        </h1>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {projects.length} โครงการ · {totalUnitCount.toLocaleString('en-US')} ห้อง · ข้อมูลอยู่ใน Google Sheet ของทีม
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginTop: '14px',
          }}
        >
          <button
            type="button"
            className="btn-sm"
            style={{
              backgroundColor:
                tab === 'projects' ? 'var(--sc-sunrise-orange)' : 'rgba(255,255,255,0.1)',
              color: tab === 'projects' ? 'var(--sc-black)' : '#FFFFFF',
              borderColor: 'transparent',
            }}
            onClick={() => setTab('projects')}
          >
            โครงการ
          </button>
          <button
            type="button"
            className="btn-sm"
            style={{
              backgroundColor:
                tab === 'users' ? 'var(--sc-sunrise-orange)' : 'rgba(255,255,255,0.1)',
              color: tab === 'users' ? 'var(--sc-black)' : '#FFFFFF',
              borderColor: 'transparent',
            }}
            onClick={() => setTab('users')}
          >
            จัดการผู้ใช้
          </button>
          <button
            type="button"
            className="btn-sm"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              borderColor: 'transparent',
            }}
            onClick={onOpenApprovalHistory}
          >
            อนุมัติดีล
          </button>
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        {tab === 'projects' ? (
          <>
            <button type="button" className="btn-orange" onClick={onAddProject}>
              <span style={{ fontSize: '20px' }}>+</span>
              <span>เพิ่มโครงการ</span>
            </button>

            <section className="sc-card" style={{ padding: '12px 14px' }}>
              <div
                className="sc-row text-xs text-clay"
                style={{ fontWeight: 600, paddingBottom: '8px' }}
              >
                <span>โครงการ</span>
                <span>ห้อง · Sinking / ส่วนกลาง</span>
                <span>สถานะ</span>
              </div>

              {projects.map((proj, idx) => (
                <div key={proj.projectCode}>
                  {idx > 0 && <div className="sc-divider" style={{ margin: '8px 0' }} />}
                  <div className="sc-row" style={{ alignItems: 'flex-start' }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '16px', minWidth: '64px' }}>
                      {proj.projectCode}
                    </div>
                    <div className="mono text-sm" style={{ flex: 1 }}>
                      {(proj.unitCount ?? 0).toLocaleString('en-US')} ·{' '}
                      {proj.sinkingRateDisplay ?? '-'} / {proj.commonFeeRateDisplay ?? '-'}
                    </div>
                    <span
                      className={`status-pill ${
                        proj.status === 'Ready to move' ? 'status-green' : 'status-yellow'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1.2fr',
                      gap: '6px',
                      marginTop: '6px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => onEditProject(proj)}
                    >
                      ตั้งค่า
                    </button>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => onImportForProject(proj)}
                    >
                      อัปโหลดราคา
                    </button>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => void openVersionHistory(proj.projectCode)}
                    >
                      ดูราคาย้อนหลัง (v{proj.priceVersion ?? 1})
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <div className="text-xs text-clay" style={{ textAlign: 'center' }}>
              กดที่โครงการเพื่ออัปเดตราคา · สถานะ = กำลังก่อสร้าง / Ready to move
            </div>
          </>
        ) : (
          <>
            {usersError && <div className="alert-error">{usersError}</div>}

            <form
              onSubmit={handleSaveUser}
              className="sc-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <h2 className="sc-card-title" style={{ margin: 0 }}>
                เพิ่ม / แก้ไขสิทธิ์ผู้ใช้ (Users Sheet)
              </h2>
              <input
                type="email"
                className="sc-input"
                placeholder="อีเมล เช่น chanyapat@scasset.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="text"
                className="sc-input"
                placeholder="ชื่อ-นามสกุล / ชื่อทีม"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <div className="sc-row" style={{ padding: 0 }}>
                <label htmlFor="user-role-select" className="text-sm" style={{ fontWeight: 600 }}>
                  บทบาท (Role)
                </label>
                <select
                  id="user-role-select"
                  className="sc-input"
                  style={{ width: '160px' }}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                >
                  <option value="sales">sales (ทีมขาย)</option>
                  <option value="admin">admin (BD/Admin)</option>
                  <option value="approver">approver (ผู้อนุมัติ)</option>
                </select>
              </div>
              <button type="submit" className="btn-black" disabled={savingUser}>
                {savingUser ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
              </button>
            </form>

            <section className="sc-card" style={{ padding: '10px 14px' }}>
              <h2 className="sc-card-title">รายชื่อผู้มีสิทธิ์ใช้งาน ({users.length})</h2>
              {usersLoading ? (
                <div className="text-sm text-clay">กำลังโหลด...</div>
              ) : (
                users.map((u, idx) => (
                  <div key={u.email}>
                    {idx > 0 && <div className="sc-divider" />}
                    <div className="sc-row" style={{ alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{u.name}</div>
                        <div className="text-xs text-clay mono" style={{ wordBreak: 'break-all' }}>
                          {u.email}
                        </div>
                      </div>
                      <span
                        className={`status-pill ${
                          u.role === 'admin' ? 'status-yellow' : 'status-neutral'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginTop: '6px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => void handleToggleRole(u)}
                      >
                        เปลี่ยนเป็น {u.role === 'admin' ? 'sales' : 'admin'}
                      </button>
                      <button
                        type="button"
                        className="btn-sm"
                        style={{ color: 'var(--sc-status-red-text)' }}
                        onClick={() => void handleDeleteUser(u.email)}
                      >
                        ลบผู้ใช้
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        <button
          type="button"
          className="btn-outline"
          style={{ width: '100%', marginTop: '4px' }}
          onClick={onLogout}
        >
          ออกจากระบบ ({user.email})
        </button>
      </main>

      {(versionModalData || versionLoading || versionError) && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="ประวัติเวอร์ชันราคา"
        >
          <div className="modal-sheet">
            <div className="sc-row" style={{ padding: 0 }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                ราคาย้อนหลัง · {versionModalData?.projectCode ?? ''}
              </h2>
              <button
                type="button"
                className="btn-sm"
                onClick={() => {
                  setVersionModalData(null);
                  setVersionError(null);
                }}
              >
                ปิด
              </button>
            </div>

            {versionError && <div className="alert-error">{versionError}</div>}
            {versionLoading && (
              <div className="text-sm text-clay">กำลังโหลดข้อมูลเวอร์ชัน...</div>
            )}

            {versionModalData && (
              <>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {versionModalData.versions.map((ver) => (
                    <button
                      key={ver.version}
                      type="button"
                      className={`btn-sm ${
                        ver.version === versionModalData.selectedVersion ? 'btn-black' : ''
                      }`}
                      style={
                        ver.version === versionModalData.selectedVersion
                          ? { width: 'auto', minHeight: '44px' }
                          : undefined
                      }
                      onClick={() =>
                        void openVersionHistory(
                          versionModalData.projectCode,
                          ver.version,
                        )
                      }
                    >
                      v{ver.version} ({ver.unitCount} ห้อง)
                    </button>
                  ))}
                </div>

                {versionModalData.versions
                  .filter((v) => v.version === versionModalData.selectedVersion)
                  .map((v) => (
                    <div key={v.version} className="text-xs text-clay">
                      เผยแพร่เมื่อ {new Date(v.publishedAt).toLocaleString('th-TH')} โดย{' '}
                      {v.publishedBy}
                    </div>
                  ))}

                <input
                  type="search"
                  className="sc-input"
                  placeholder="กรองรหัสห้องในเวอร์ชันนี้..."
                  value={versionQuery}
                  onChange={(e) => setVersionQuery(e.target.value)}
                />

                <div className="sc-card" style={{ padding: '8px 12px' }}>
                  {filteredVersionUnits.length === 0 ? (
                    <div className="text-sm text-clay">ไม่พบห้องในเวอร์ชันนี้</div>
                  ) : (
                    filteredVersionUnits.map((u, idx) => (
                      <div key={`${u.id}-v${versionModalData.selectedVersion}`}>
                        {idx > 0 && <div className="sc-divider" style={{ margin: '6px 0' }} />}
                        <div className="sc-row" style={{ padding: '2px 0' }}>
                          <span className="mono" style={{ fontWeight: 700 }}>
                            {u.unitCode}
                          </span>
                          <span className="text-xs text-clay">{u.unitStatus}</span>
                        </div>
                        <div className="sc-row text-xs mono" style={{ padding: '2px 0' }}>
                          <span>M: {formatBaht(u.sgp)}</span>
                          <span>O: {formatBaht(u.sgpCost)}</span>
                          <span>R: {formatBaht(u.agentNetPrice)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
