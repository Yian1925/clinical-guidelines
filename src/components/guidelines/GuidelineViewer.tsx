import { useState, useEffect } from 'react';
import GuidelineTree from './GuidelineTree';
import { useAppStore } from '../../store';
// @ts-expect-error InvasiveBreastCancerNCCN is JSX, no declaration file
import InvasiveBreastCancerNCCN from './InvasiveBreastCancerNCCN';
import cervicalTreeData from '../../data/guidelines/cervical_cancer_tree_complete.json';
import invasiveBreast3LayerData from '../../data/guidelines/nccn_invasive_breast_3layer.json';
import type { LymphomaDoc } from '../../hooks/useGuideline';

interface GuidelineViewerProps {
  doc: LymphomaDoc | null;
  onAskAboutNode?: (nodeTitle: string) => void;
  onNavigateToChat?: () => void;
}

export default function GuidelineViewer({ doc, onAskAboutNode: _onAsk, onNavigateToChat: _onNav }: GuidelineViewerProps) {
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const { guidelineTocId, setGuidelineTocId } = useAppStore();

  useEffect(() => {
    if (guidelineTocId) {
      setActiveTocId(guidelineTocId);
      setGuidelineTocId(null);
    }
  }, [guidelineTocId, setGuidelineTocId]);

  if (!doc) return <div className="gl-main">加载中...</div>;

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
      <div className="gl-layout">
        <GuidelineTree toc={doc.toc} activeId={currentTocId || undefined} onSelect={setActiveTocId} />
        <div className="gl-main" style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: '8px 20px 12px',
              marginBottom: 0,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.01em',
              }}
            >
              {currentLabel}
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#94A3B8',
                marginTop: 2,
              }}
            >
              {hasCervicalPathway
                ? 'ESMO Clinical Practice Guidelines · 2017'
                : hasEarlyBreastPathway
                  ? 'NCCN Clinical Practice Guidelines in Oncology · Invasive Breast Cancer (M0)'
                  : '数据来源'}
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
                暂无该疾病的诊疗路径数据，请选择「宫颈癌 / 浸润性乳腺癌」或其他已接入疾病。
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="page-footnote">
        标准诊疗路径来源于公开临床指南、医学文献及专家共识，仅供临床参考。
      </div>
    </>
  );
}
