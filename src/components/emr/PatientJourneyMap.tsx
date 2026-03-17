import { useState, useMemo, useRef, useCallback } from 'react';
import type { JourneyTrack, TimelineEventItem } from '../../types';
import type { PatientTimelineData } from '../../hooks/usePatientTimeline';
import { getXPctForRange } from '../../hooks/usePatientTimeline';

const MIN_ZOOM = 0.35;
/** 同一行上相邻气泡最小间距（比例），保证不重叠 */
const MIN_CHIP_GAP = 0.09;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.12;
const TRACK_ROW_HEIGHT = 56;

function usePositions(
  track: JourneyTrack,
  dateRange: [string, string]
): { pct: number; item: TimelineEventItem }[] {
  return useMemo(() => {
    const withPct = track.items
      .filter((item) => item.label !== '2B/10')
      .map((item) => ({ pct: getXPctForRange(item.date, dateRange), item }))
      .filter((x): x is { pct: number; item: TimelineEventItem } => x.pct != null);
    withPct.sort((a, b) => a.pct - b.pct);
    let lastEnd = -MIN_CHIP_GAP;
    return withPct.map(({ pct, item }) => {
      const displayPct = Math.max(pct, lastEnd + MIN_CHIP_GAP);
      lastEnd = displayPct + MIN_CHIP_GAP;
      return { pct: displayPct, item };
    });
  }, [track, dateRange]);
}

interface PatientJourneyMapProps {
  data: PatientTimelineData | null;
  loading?: boolean;
  onEventClick?: (label: string, detail: string) => void;
}

export default function PatientJourneyMap({ data, loading, onEventClick }: PatientJourneyMapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    meta: string;
    tagBg: string;
    tagColor: string;
    tagBorder: string;
  } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.journey-event-chip') || (e.target as HTMLElement).closest('.journey-zoom-controls')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);
  const handleMouseLeave = useCallback(() => setIsPanning(false), []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP)), []);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="journey-empty">加载旅程数据中…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="journey-empty">暂无旅程数据，请选择其他患者或确认该患者已接入病程数据。</div>
      </div>
    );
  }

  const { patient_id, patient_summary, tracks, dateRange } = data;
  const s = patient_summary;

  return (
    <div className="journey-container">
      <div className="journey-header-row">
        <div className="journey-patient-badge">患者 {patient_id}</div>
        <div className="journey-meta-item">性别 <span>{s.gender}</span></div>
        <div className="journey-meta-item">年龄 <span>{s.age}岁</span></div>
        <div className="journey-meta-item">住院 <span>{s.admission_date} → {s.discharge_date}</span></div>
        <div className="journey-meta-item">最终诊断 <span>{s.final_diagnosis}</span></div>
        <div className="journey-meta-item" style={{ marginLeft: 260 }}>
          治疗结果 <span style={{ color: 'var(--green, #3B6D11)' }}>{s.treat_result}</span>
        </div>
      </div>

      <div
        className="journey-canvas-wrap"
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="journey-canvas-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
        >
          <div className="journey-timeline-wrap">
            <div className="journey-time-v-wrap">
              <span className="journey-time-label">时间</span>
              <div className="journey-time-v" />
            </div>
            {tracks.map((track, ti) => (
              <TrackRow
                key={track.id}
                track={track}
                dateRange={dateRange}
                isFirst={ti === 0}
                onHover={(pos, title, meta, tagStyle) => setTooltip(pos && tagStyle ? { x: pos.x, y: pos.y, title, meta, ...tagStyle } : null)}
                onEventClick={onEventClick}
              />
            ))}
            <div className="journey-time-h-wrap">
              <div className="journey-time-h" />
              <span className="journey-time-label">时间</span>
            </div>
          </div>
        </div>

        <div className="journey-zoom-controls">
          <button type="button" className="journey-zoom-btn" onClick={zoomOut} aria-label="缩小">−</button>
          <span className="journey-zoom-pct">{Math.round(scale * 100)}%</span>
          <button type="button" className="journey-zoom-btn" onClick={zoomIn} aria-label="放大">+</button>
        </div>
      </div>

      <div className="journey-footer">
        <div className="journey-legend">
          {tracks.map((t) => (
            <div key={t.id} className="journey-legend-item">
              <div
                className="journey-legend-dot"
                style={{ background: t.color.bg, borderColor: t.color.dot }}
              />
              <span>{t.label}</span>
            </div>
          ))}
          <div className="journey-legend-item">
            <div
              className="journey-legend-dot"
              style={{ background: '#FAEEDA', border: '0.5px solid #EF9F27', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#633806', fontWeight: 500 }}
            >↑</div>
            <span>异常指标</span>
          </div>
        </div>
        {/* <div className="journey-canvas-hint">滚轮缩放 · 拖拽平移</div> */}
      </div>

      {tooltip && (
        <div
          className={`journey-tooltip ${tooltip ? 'visible' : ''}`}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="journey-tooltip-title">
            <span
              className="journey-tooltip-tag"
              style={{ background: tooltip.tagBg, color: tooltip.tagColor, border: `0.5px solid ${tooltip.tagBorder}` }}
            />
            {' '}{tooltip.title}
          </div>
          <div className="journey-tooltip-meta" dangerouslySetInnerHTML={{ __html: tooltip.meta }} />
        </div>
      )}
    </div>
  );
}

const CHIP_VERTICAL_OFFSET = 14;

function TrackRow({
  track,
  dateRange,
  isFirst,
  onHover,
  onEventClick,
}: {
  track: JourneyTrack;
  dateRange: [string, string];
  isFirst: boolean;
  onHover: (pos: { x: number; y: number } | null, title: string, meta: string, tagStyle: { tagBg: string; tagColor: string; tagBorder: string } | null) => void;
  onEventClick?: (label: string, detail: string) => void;
}) {
  const positions = usePositions(track, dateRange);
  const c = track.color;
  const trackHeight = TRACK_ROW_HEIGHT;
  const yChip = CHIP_VERTICAL_OFFSET;
  const yConn = Math.floor(trackHeight / 2) - 1;

  return (
    <>
      {!isFirst && <div className="journey-track-divider" />}
      <div className="journey-track-row" style={{ minWidth: 900, minHeight: trackHeight }}>
        <div className="journey-track-axis" />
        <div className="journey-track-label">{track.label}</div>
        <div className="journey-track-line">
          <div style={{ position: 'relative', height: trackHeight }}>
            {positions.map(({ pct, item }, idx) => {
              const xPct = pct * 100;
              const tagStyle = { tagBg: c.bg, tagColor: c.text, tagBorder: c.border };
              const titleBase = item.label || item.type || '';
              const title =
                item.type && item.label && item.type !== item.label
                  ? `${item.type} ${item.label}`
                  : titleBase;
              let meta = `<div>${item.detail}</div>`;
              if (item.date) meta += `<div style="margin-top:4px;color:var(--color-text-tertiary);font-size:11px">${item.date}</div>`;
              if (item.note) meta += `<div style="margin-top:4px;font-style:italic">${item.note}</div>`;
              if (item.abnormal) meta += `<div style="margin-top:4px;color:#b45309;font-size:11px">⚠ 存在异常指标</div>`;

              return (
                <div
                  key={idx}
                  className="journey-event-chip"
                  style={{
                    left: `${xPct}%`,
                    top: yChip,
                    transform: 'translateX(-50%)',
                    background: c.bg,
                    color: c.text,
                    borderColor: c.border,
                    boxShadow: item.highlight ? `0 0 0 1.5px ${c.border}` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onHover(
                      { x: rect.left + rect.width / 2, y: rect.bottom + 8 },
                      title,
                      meta,
                      tagStyle
                    );
                  }}
                  onMouseLeave={() => onHover(null, '', '', null)}
                  onClick={() => onEventClick?.(item.label, item.detail)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEventClick?.(item.label, item.detail)}
                >
                  {item.label}
                  {item.abnormal && (
                    <span
                      className="journey-ab-badge"
                      style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}
                    >↑</span>
                  )}
                </div>
              );
            })}
            {positions.length > 1 && positions.map((_, i) => {
              if (i >= positions.length - 1) return null;
              const x1 = positions[i].pct * 100;
              const x2 = positions[i + 1].pct * 100;
              const diff = x2 - x1;
              if (diff <= 2) return null;
              return (
                <div
                  key={`conn-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${x1}%`,
                    width: `${diff}%`,
                    top: yConn,
                    height: 2,
                    background: c.border,
                    opacity: 0.5,
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
