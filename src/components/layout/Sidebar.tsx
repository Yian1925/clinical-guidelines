import type { PageId } from '../../types';

interface SidebarProps {
  page: PageId;
  onPageChange: (page: PageId) => void;
}

const navItems: { id: PageId; label: string; labelZh: string; icon: string }[] = [
  { id: 'chat', label: 'Agent 问答', labelZh: 'AI助手', icon: 'chat' },
  { id: 'guidelines', label: '诊疗路径', labelZh: '指南', icon: 'guidelines' },
  { id: 'patients', label: '患者旅程', labelZh: '旅程图', icon: 'patients' },
];

export default function Sidebar({ page, onPageChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-ring">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22H8L12 11L17 37L23 20L27 28L34 15L38 29L40 22H44" />
          </svg>
        </div>
        <div>
          <div className="logo-text">MedGuide AI</div>
          <div className="logo-sub">临床决策支持平台</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div
          className={`nav-item ${page === navItems[0].id ? 'active' : ''}`}
          onClick={() => onPageChange(navItems[0].id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onPageChange(navItems[0].id)}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h14v10H3z" rx="2" />
            <path d="M6 14l-3 3v-3" />
          </svg>
          {navItems[0].label} <span className="zh">{navItems[0].labelZh}</span>
        </div>
        <div className="nav-section">临床资源</div>
        {navItems.slice(1).map((item) => (
          <div
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onPageChange(item.id)}
          >
            {item.icon === 'guidelines' && (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="14" height="14" rx="2" />
                <path d="M7 7h6M7 10h6M7 13h4" />
              </svg>
            )}
            {item.icon === 'patients' && (
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="7" />
                <path d="M10 7v3l2 2" />
              </svg>
            )}
            {item.label} <span className="zh">{item.labelZh}</span>
          </div>
        ))}
        <div className="nav-section">历史</div>
        <div className="nav-item" style={{ fontSize: 12, padding: '7px 16px', color: '#666' }}>
          弥漫大B细胞淋巴瘤诊断...
        </div>
        <div className="nav-item" style={{ fontSize: 12, padding: '7px 16px', color: '#666' }}>
          套细胞淋巴瘤一线治疗方案...
        </div>
        <div className="nav-item" style={{ fontSize: 12, padding: '7px 16px', color: '#666' }}>
          滤泡性淋巴瘤分期评估...
        </div>
      </nav>
    </aside>
  );
}
