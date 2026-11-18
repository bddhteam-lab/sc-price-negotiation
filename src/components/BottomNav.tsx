interface BottomNavProps {
  activeTab: 'home' | 'history';
  onSelect: (tab: 'home' | 'history') => void;
}

export function BottomNav({ activeTab, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelect('home')}
      >
        <span className="nav-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
          </svg>
        </span>
        <span>หน้าแรก</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onSelect('history')}
      >
        <span className="nav-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
          </svg>
        </span>
        <span>ประวัติ</span>
      </button>
    </nav>
  );
}
