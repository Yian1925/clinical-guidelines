import type { PatientsJourneyTopBar } from '../../store';

interface TopBarProps {
  title: string;
  badge?: string;
  onNewChat?: () => void;
  /** 替换顶栏主标题区（与「病例库」同一位） */
  patientsJourney?: PatientsJourneyTopBar | null;
}

export default function TopBar({ title, badge, onNewChat, patientsJourney }: TopBarProps) {
  if (patientsJourney) {
    return (
      <header className="topbar topbar--patients-journey">
        <button type="button" className="topbar-crumb-btn" onClick={patientsJourney.onBack} aria-label="返回真实世界病例库列表">
          <span className="topbar-crumb-chevron" aria-hidden="true">
            ›
          </span>
          <span className="topbar-crumb-label">{patientsJourney.patientName} · {patientsJourney.admissionId}</span>
        </button>
      </header>
    );
  }
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      {badge ? <span className="topbar-badge">{badge}</span> : null}
      {onNewChat && (
        <button type="button" className="btn-new" onClick={onNewChat}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 4v12M4 10h12" />
          </svg>
          新会话
        </button>
      )}
    </header>
  );
}
