import { useCallback, useEffect, useState } from 'react';
import { ApiClientAuth, callApi } from './client/apiClient';
import { AdminImportScreen } from './components/AdminImportScreen';
import { AdminProjectFormScreen } from './components/AdminProjectFormScreen';
import { AdminProjectsScreen } from './components/AdminProjectsScreen';
import { CalculatorScreen } from './components/CalculatorScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { LoginScreen } from './components/LoginScreen';
import { SalesHomeScreen } from './components/SalesHomeScreen';
import { UnitCardScreen } from './components/UnitCardScreen';
import {
  AdminPublishUnitsData,
  CatalogBootstrapData,
  DealLogRecord,
  ProjectConfig,
  SalesUnitRecord,
  UnitRecord,
  UnitsGetData,
  UserRecord,
} from './shared/types';

type Screen =
  | 'login'
  | 'sales-home'
  | 'unit-card'
  | 'calculator'
  | 'history'
  | 'admin-projects'
  | 'admin-project-form'
  | 'admin-import';

const SESSION_AUTH_KEY = 'sc_price_neg_auth';

export function App() {
  const [auth, setAuth] = useState<ApiClientAuth | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
      return raw ? (JSON.parse(raw) as ApiClientAuth) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserRecord | null>(null);
  const [viewMode, setViewMode] = useState<'sales' | 'admin'>('sales');
  const [screen, setScreen] = useState<Screen>('login');

  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [totalUnitCount, setTotalUnitCount] = useState(0);
  const [recentUnits, setRecentUnits] = useState<Array<UnitRecord | SalesUnitRecord>>([]);

  const [activeUnit, setActiveUnit] = useState<UnitRecord | SalesUnitRecord | null>(null);
  const [activeUnitProject, setActiveUnitProject] = useState<ProjectConfig | null>(null);

  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);
  const [importTargetProject, setImportTargetProject] = useState<ProjectConfig | null>(null);

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const loadBootstrap = useCallback(
    async (
      nextAuth: ApiClientAuth,
      options?: { navigateToDefault?: boolean },
    ) => {
      setLoading(true);
      setAuthError(null);
      const res = await callApi<CatalogBootstrapData>(
        'catalog.bootstrap',
        { includeInactive: true },
        nextAuth,
      );
      setLoading(false);

      if (!res.ok) {
        setAuthError(res.errorMessage);
        setAuth(null);
        setUser(null);
        setScreen('login');
        sessionStorage.removeItem(SESSION_AUTH_KEY);
        return false;
      }

      const data = res.data;
      setUser(data.user);
      setProjects(data.projects);
      setTotalUnitCount(data.totalUnitCount);
      setRecentUnits((prev) => {
        if (prev.length > 0) return prev;
        return data.recentUnits;
      });

      if (options?.navigateToDefault) {
        const isAdmin = data.user.role === 'admin';
        setViewMode(isAdmin ? 'admin' : 'sales');
        setScreen(isAdmin ? 'admin-projects' : 'sales-home');
      }
      return true;
    },
    [],
  );

  useEffect(() => {
    if (auth && !user) {
      void loadBootstrap(auth, { navigateToDefault: true });
    }
  }, [auth, user, loadBootstrap]);

  const handleLoginWithAuth = useCallback(
    async (nextAuth: ApiClientAuth) => {
      setAuth(nextAuth);
      sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(nextAuth));
      setRecentUnits([]);
      await loadBootstrap(nextAuth, { navigateToDefault: true });
    },
    [loadBootstrap],
  );

  const handleDevLogin = (email: string) => {
    void handleLoginWithAuth({ devEmail: email });
  };

  const handleGoogleToken = useCallback(
    (idToken: string) => {
      void handleLoginWithAuth({ idToken });
    },
    [handleLoginWithAuth],
  );

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setAuth(null);
    setUser(null);
    setActiveUnit(null);
    setActiveUnitProject(null);
    setRecentUnits([]);
    setToast(null);
    setScreen('login');
  };

  const handleSelectUnit = async (projectCode: string, unitCode: string) => {
    if (!auth) return;
    setToast(null);
    const res = await callApi<UnitsGetData>(
      'units.get',
      { projectCode, unitCode },
      auth,
    );
    if (!res.ok) {
      setToast({ type: 'error', text: res.errorMessage });
      return;
    }

    const { unit, project } = res.data;
    setActiveUnit(unit);
    setActiveUnitProject(project);
    setRecentUnits((prev) => {
      const filtered = prev.filter((u) => u.id !== unit.id);
      return [unit, ...filtered].slice(0, 5);
    });
    setScreen('unit-card');
  };

  const handleDealSaved = (
    deal: DealLogRecord,
    actionType: 'save' | 'request_approval',
  ) => {
    setToast({
      type: 'success',
      text:
        actionType === 'request_approval'
          ? `ส่งขออนุมัติดีล ${deal.projectCode} · ${deal.unitCode} แล้ว`
          : `บันทึกดีล ${deal.projectCode} · ${deal.unitCode} เรียบร้อย`,
    });
    setScreen('history');
  };

  const handleProjectSaved = async (
    savedProject: ProjectConfig,
    goToImport: boolean,
    warningMessage?: string,
  ) => {
    if (auth) {
      await loadBootstrap(auth);
    }
    if (warningMessage) {
      setToast({ type: 'warning', text: warningMessage });
    } else {
      setToast({
        type: 'success',
        text: `บันทึกโครงการ ${savedProject.projectCode} เรียบร้อย`,
      });
    }

    if (goToImport) {
      setImportTargetProject(savedProject);
      setScreen('admin-import');
    } else {
      setScreen('admin-projects');
    }
  };

  const handleUnitsPublished = async (summary: AdminPublishUnitsData) => {
    if (auth) {
      await loadBootstrap(auth);
    }
    const verSummary = Object.entries(summary.versions)
      .map(([code, ver]) => `${code} (v${ver})`)
      .join(', ');
    setToast({
      type: 'success',
      text: `เผยแพร่ราคา ${summary.publishedCount.toLocaleString('en-US')} ห้องสำเร็จ: ${verSummary}`,
    });
    setScreen('admin-projects');
  };

  return (
    <div className="app-viewport">
      <div className="app-shell">
        {toast && screen !== 'login' && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor:
                toast.type === 'warning'
                  ? 'var(--sc-status-yellow-bg)'
                  : toast.type === 'error'
                  ? 'var(--sc-status-red-bg)'
                  : 'var(--sc-status-green-bg)',
              color:
                toast.type === 'warning'
                  ? 'var(--sc-status-yellow-text)'
                  : toast.type === 'error'
                  ? 'var(--sc-status-red-text)'
                  : 'var(--sc-status-green-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ minWidth: '44px', fontSize: '16px' }}
              aria-label="ปิดการแจ้งเตือน"
            >
              ×
            </button>
          </div>
        )}

        {(screen === 'login' || !user || !auth) && (
          <LoginScreen
            loading={loading}
            errorMessage={authError}
            onDevLogin={handleDevLogin}
            onGoogleToken={handleGoogleToken}
          />
        )}

        {user && auth && screen === 'sales-home' && (
          <SalesHomeScreen
            user={user}
            auth={auth}
            projects={projects.filter((p) => p.active !== false)}
            totalUnitCount={totalUnitCount}
            recentUnits={recentUnits}
            onSelectUnit={(p, u) => void handleSelectUnit(p, u)}
            onNavigateHistory={() => {
              setToast(null);
              setScreen('history');
            }}
            onSwitchToAdmin={
              user.role === 'admin'
                ? () => {
                    setToast(null);
                    setViewMode('admin');
                    setScreen('admin-projects');
                  }
                : undefined
            }
            onNavigateAddProject={
              user.role === 'admin'
                ? () => {
                    setViewMode('admin');
                    setEditingProject(null);
                    setScreen('admin-project-form');
                  }
                : undefined
            }
            onLogout={handleLogout}
          />
        )}

        {user && auth && screen === 'unit-card' && activeUnit && activeUnitProject && (
          <UnitCardScreen
            unit={activeUnit}
            project={activeUnitProject}
            showAdminCost={user.role === 'admin'}
            onBack={() => setScreen('sales-home')}
            onOpenCalc={() => setScreen('calculator')}
          />
        )}

        {user && auth && screen === 'calculator' && activeUnit && activeUnitProject && (
          <CalculatorScreen
            unit={activeUnit}
            project={activeUnitProject}
            auth={auth}
            onBack={() => setScreen('unit-card')}
            onDealSaved={handleDealSaved}
          />
        )}

        {user && auth && screen === 'history' && (
          <HistoryScreen
            auth={auth}
            isAdminView={user.role === 'admin' || user.role === 'approver'}
            onNavigateHome={() =>
              setScreen(viewMode === 'admin' && user.role === 'admin' ? 'admin-projects' : 'sales-home')
            }
          />
        )}

        {user && auth && screen === 'admin-projects' && (
          <AdminProjectsScreen
            user={user}
            auth={auth}
            projects={projects}
            totalUnitCount={totalUnitCount}
            onSwitchToSales={() => {
              setToast(null);
              setViewMode('sales');
              setScreen('sales-home');
            }}
            onOpenApprovalHistory={() => {
              setToast(null);
              setScreen('history');
            }}
            onAddProject={() => {
              setToast(null);
              setEditingProject(null);
              setScreen('admin-project-form');
            }}
            onEditProject={(proj) => {
              setToast(null);
              setEditingProject(proj);
              setScreen('admin-project-form');
            }}
            onImportForProject={(proj) => {
              setToast(null);
              setImportTargetProject(proj);
              setScreen('admin-import');
            }}
            onLogout={handleLogout}
          />
        )}

        {user && auth && screen === 'admin-project-form' && (
          <AdminProjectFormScreen
            initialProject={editingProject}
            auth={auth}
            onBack={() => setScreen('admin-projects')}
            onSaved={(proj, goToImport, warning) =>
              void handleProjectSaved(proj, goToImport, warning)
            }
          />
        )}

        {user && auth && screen === 'admin-import' && (
          <AdminImportScreen
            targetProject={importTargetProject}
            auth={auth}
            onBack={() => setScreen('admin-projects')}
            onPublished={(summary) => void handleUnitsPublished(summary)}
          />
        )}
      </div>
    </div>
  );
}
