import type { GuidelineNodeData } from '../../types';

interface GuidelineNodeProps {
  node: GuidelineNodeData;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}

export default function GuidelineNode({ node, highlighted, onSelect }: GuidelineNodeProps) {
  const handleClick = () => onSelect?.(node.id);

  return (
    <div
      className={`fnode ${node.type}`}
      onClick={handleClick}
      style={highlighted ? { boxShadow: '0 0 0 2px #C84B2F' } : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="fnode-tag">{node.tag}</div>
      <div className="fnode-title">{node.title}</div>
      {node.body && <div className="fnode-body" dangerouslySetInnerHTML={{ __html: node.body.replace(/\n/g, '<br/>') }} />}
      {node.options && (
        <div className="radio-list">
          {node.options.map((opt) => (
            <div key={opt.label} className="radio-item">
              <div className={`radio-dot ${opt.selected ? 'sel' : ''}`} />
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {node.ref && <span className="fnode-ref">{node.ref}</span>}
    </div>
  );
}
