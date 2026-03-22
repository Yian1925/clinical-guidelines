import { useState, useEffect, useRef } from 'react';
import GuidelineTree from './GuidelineTree';
import { useAppStore } from '../../store';
// @ts-expect-error InvasiveBreastCancerNCCN is JSX, no declaration file
import InvasiveBreastCancerNCCN from './InvasiveBreastCancerNCCN';
import cervicalTreeData from '../../data/guidelines/CervicalCancerCols.json';
import invasiveBreast3LayerData from '../../data/guidelines/nccn_invasive_breast_3layer.json';
import type { LymphomaDoc } from '../../hooks/useGuideline';

const SPLIT_MIN = 240;
const SPLIT_MAX = 520;
const SPLIT_STEP = 8;

interface GuidelineViewerProps {
  doc: LymphomaDoc | null;
  onAskAboutNode?: (nodeTitle: string) => void;
  onNavigateToChat?: () => void;
}

export default function GuidelineViewer({ doc }: GuidelineViewerProps) {
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [tocWidth, setTocWidth] = useState(280);
  const [resizing, setResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { guidelineTocId, setGuidelineTocId } = useAppStore();

  useEffect(() => {
    if (guidelineTocId) {
      setActiveTocId(guidelineTocId);
      setGuidelineTocId(null);
    }
  }, [guidelineTocId, setGuidelineTocId]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const next = Math.max(240, Math.min(520, e.clientX - rect.left - 4));
      setTocWidth(next);
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  if (!doc) return <div className="gl-main">正在加载指南目录…</div>;

  const currentTocId = activeTocId || 'tumor-breast';
  const hasCervicalPathway = currentTocId === 'tumor-cervical';
  const hasEarlyBreastPathway = currentTocId === 'tumor-breast';

  const currentLabel = (() => {
    for (const item of doc.toc) {
      const found = item.children?.find((c) => c.id === currentTocId);
      if (found) return found.label;
    }
    return '';
  })();

  return (
    <>
      <div className="gl-layout" ref={layoutRef}>
        <GuidelineTree toc={doc.toc} activeId={currentTocId || undefined} onSelect={setActiveTocId} panelWidth={tocWidth} />
        <div
          className={`pane-splitter ${resizing ? 'active' : ''}`}
          onMouseDown={() => setResizing(true)}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="调整目录和画板宽度，使用左右方向键微调"
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          aria-valuenow={tocWidth}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setTocWidth((w) => Math.max(SPLIT_MIN, w - SPLIT_STEP));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setTocWidth((w) => Math.min(SPLIT_MAX, w + SPLIT_STEP));
            }
          }}
        />
        <div className="gl-main gl-main--stack">
          <div className="gl-doc-header">
            <span className="gl-doc-title">{currentLabel}</span>
            <span className="gl-doc-meta">
              {hasCervicalPathway
                ? 'ESMO Clinical Practice Guidelines · 2017'
                : hasEarlyBreastPathway
                  ? 'NCCN Clinical Practice Guidelines in Oncology · Invasive Breast Cancer (M0)'
                  : '在左侧选择疾病后，将显示对应指南来源与说明'}
            </span>
          </div>
          {hasCervicalPathway ? (
            <div style={{ flex: 1, minHeight: 520 }}>
              <InvasiveBreastCancerNCCN sourceData={cervicalTreeData} embedded />
            </div>
          ) : hasEarlyBreastPathway ? (
            <div style={{ flex: 1, minHeight: 520 }}>
              <InvasiveBreastCancerNCCN sourceData={invasiveBreast3LayerData} embedded />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <div className="journey-empty">
                当前疾病尚未接入诊疗路径。请在左侧选择「宫颈癌」或「浸润性乳腺癌」等已接入病种。
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
