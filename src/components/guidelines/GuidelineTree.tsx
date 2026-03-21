import { useState, useMemo } from 'react';
import type { TocItem } from '../../types';

interface GuidelineTreeProps {
  toc: TocItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  panelWidth?: number;
}

export default function GuidelineTree({ toc, activeId, onSelect, panelWidth }: GuidelineTreeProps) {
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    toc.forEach((item) => {
      init[item.id] = true;
    });
    return init;
  });

  const filtered = useMemo(() => {
    const k = keyword.trim();
    if (!k) return toc;
    return toc
      .map((item): TocItem | null => {
        const labelMatch = item.label.includes(k) || item.labelZh?.includes(k);
        const childMatches = (item.children ?? []).filter((c) => c.label.includes(k));
        if (labelMatch) return item;
        if (childMatches.length > 0) return { ...item, children: childMatches };
        return null;
      })
      .filter((x): x is TocItem => x !== null);
  }, [toc, keyword]);

  return (
    <div className="gl-toc" style={panelWidth ? { width: panelWidth, minWidth: panelWidth } : undefined}>
      <div className="toc-search-wrap">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="搜索疾病名称…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="toc-search-input"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setKeyword((k) => k.trim())}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-secondary)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            搜索
          </button>
        </div>
      </div>
      <div className="toc-list-wrap">
        {filtered.map((item) => {
          const isExpanded = expanded[item.id] ?? true;
          const hasChildren = (item.children ?? []).length > 0;
          const toggle = () => {
            if (!hasChildren) return;
            setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }));
          };
          return (
            <div key={item.id}>
              <div
                className="toc-item toc-parent"
                role={hasChildren ? 'button' : undefined}
                tabIndex={hasChildren ? 0 : -1}
                onClick={toggle}
                onKeyDown={(e) => hasChildren && e.key === 'Enter' && toggle()}
              >
                <span>{item.label}</span>
                {item.labelZh && <span className="zh">{item.labelZh}</span>}
                <span className="toc-parent-icon">{isExpanded ? '▾' : '▸'}</span>
              </div>
              {isExpanded && item.children?.map((child) => (
                <div
                  key={child.id}
                  className={`toc-sub ${activeId === child.id ? 'active' : ''}`}
                  onClick={() => onSelect?.(child.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect?.(child.id)}
                >
                  {child.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
