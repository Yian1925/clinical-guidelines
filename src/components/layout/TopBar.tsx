interface TopBarProps {
  title: string;
  badge?: string;
  onNewChat?: () => void;
}

export default function TopBar({ title, badge, onNewChat }: TopBarProps) {
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
