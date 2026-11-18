import { useEffect, useRef, useState } from 'react';

interface LoginScreenProps {
  loading: boolean;
  errorMessage: string | null;
  onDevLogin: (email: string) => void;
  onGoogleToken: (idToken: string) => void;
}

const SANDBOX_ACCOUNTS = [
  {
    email: 'sales@scasset.com',
    label: 'เข้าใช้งานเป็น ทีมขาย SC (Sales)',
    sub: 'sales@scasset.com · ไม่เห็นต้นทุน M/O',
    styleClass: 'btn-orange',
  },
  {
    email: 'bddhteam@gmail.com',
    label: 'เข้าใช้งานเป็น BD Admin (ทีมหลัก)',
    sub: 'bddhteam@gmail.com · จัดการโครงการ + อนุมัติ',
    styleClass: 'btn-black',
  },
  {
    email: 'chanyapat@scasset.com',
    label: 'เข้าใช้งานเป็น พี่แนท (BD Admin)',
    sub: 'chanyapat@scasset.com · สิทธิ์ Admin',
    styleClass: 'btn-outline',
  },
] as const;

export function LoginScreen({
  loading,
  errorMessage,
  onDevLogin,
  onGoogleToken,
}: LoginScreenProps) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) {
      return;
    }

    const tryInit = (): boolean => {
      const api = window.google?.accounts?.id;
      if (!api || !googleBtnRef.current) return false;
      api.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) {
            onGoogleToken(response.credential);
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      api.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: 320,
        text: 'signin_with',
      });
      setGsiReady(true);
      return true;
    };

    if (!tryInit()) {
      const timer = window.setInterval(() => {
        if (tryInit()) {
          window.clearInterval(timer);
        }
      }, 300);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [googleClientId, onGoogleToken]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailInput.trim().toLowerCase();
    if (!cleaned) return;
    onDevLogin(cleaned);
  };

  return (
    <>
      <header className="header-orange" style={{ paddingBottom: '26px' }}>
        <div className="brand-lockup">
          <img
            src={`${import.meta.env.BASE_URL}sc-logo.png`}
            alt="SC Asset"
            className="brand-logo"
          />
          <div className="brand-divider" />
          <div>
            <div className="brand-title">ต่อรองราคา</div>
            <div className="brand-subtitle">SC Asset · BD &amp; Sales Team</div>
          </div>
        </div>
        <div style={{ marginTop: '14px', fontSize: '14px', fontWeight: 500 }}>
          เข้าสู่ระบบเพื่อเช็กข้อมูลห้อง คำนวณราคาต่อรอง และส่งขออนุมัติดีล
        </div>
      </header>

      <main className="page-body page-body-no-nav">
        {errorMessage && <div className="alert-error">{errorMessage}</div>}

        {googleClientId && (
          <section className="sc-card">
            <h2 className="sc-card-title">เข้าสู่ระบบด้วยบัญชี Google ทีม</h2>
            <div
              ref={googleBtnRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                minHeight: '44px',
              }}
            />
            {!gsiReady && (
              <div className="text-xs text-clay" style={{ textAlign: 'center', marginTop: '8px' }}>
                กำลังโหลดปุ่ม Google Sign-In...
              </div>
            )}
          </section>
        )}

        <form
          onSubmit={handleEmailSubmit}
          className="sc-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <h2 className="sc-card-title" style={{ marginBottom: '2px' }}>
            เข้าสู่ระบบด้วยอีเมลที่ได้รับอนุมัติในชีต Users
          </h2>
          <input
            type="email"
            className="sc-input"
            placeholder="เช่น chanyapat@scasset.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            aria-label="อีเมลผู้ใช้งาน"
          />
          <button
            type="submit"
            disabled={loading || !emailInput.trim()}
            className="btn-black"
            style={{ minHeight: '48px', fontSize: '15px' }}
          >
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>
          <div className="text-xs text-clay">
            ระบบตรวจสอบสิทธิ์และบทบาท (Admin / Sales) จากชีต Users โดยตรง
          </div>
        </form>

        <section className="sc-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 className="sc-card-title" style={{ marginBottom: '2px' }}>
            เลือกบัญชีด่วน (Quick Login)
          </h2>
          {SANDBOX_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={loading}
              className={acc.styleClass}
              style={{
                width: '100%',
                flexDirection: 'column',
                padding: '10px 16px',
                gap: '2px',
              }}
              onClick={() => onDevLogin(acc.email)}
            >
              <span style={{ fontSize: '15px', fontWeight: 700 }}>{acc.label}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>{acc.sub}</span>
            </button>
          ))}
        </section>
      </main>
    </>
  );
}
