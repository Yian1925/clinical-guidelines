import { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Patient } from '../../types';
import type { PatientTimelineV4, TimelineEventV4 } from '../../hooks/usePatientTimeline';
import { buildMergedJourneySvg, computeCategoryPillCenters, JOURNEY_SVG } from './journeySvgLayout';
import '../../styles/patient-journey-v4.css';

/** 与诊疗路径画板 InvasiveBreastCancerNCCN — ZONES 色系一致 */
const CAT_CFG: Record<string, { color: string; trackColor: string; cardBg: string }> = {
  诊断: { color: '#1A4776', trackColor: '#85B7EB', cardBg: '#EDF3FB' },
  病历文书: { color: '#2A7D5E', trackColor: '#7CB89E', cardBg: '#F0F9F5' },
  检查: { color: '#0D5C3E', trackColor: '#9CCEB4', cardBg: '#EDF8F3' },
  化验: { color: '#8C4A10', trackColor: '#D8B48A', cardBg: '#FBF3ED' },
  医嘱: { color: '#4A2880', trackColor: '#BCA8E0', cardBg: '#F2EDF9' },
};

const CAT_ORDER = ['诊断', '病历文书', '检查', '化验', '医嘱'] as const;

/** 用于左侧分类按钮锚点：折叠某类时仍按「全部展开」时的垂直位置，避免按钮跳动 */
const NO_COLLAPSE: Record<string, boolean> = Object.fromEntries(
  CAT_ORDER.map((c) => [c, false])
) as Record<string, boolean>;

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanLabel(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t || t.toLowerCase() === 'none') return '';
  return t;
}

function getTitle(ev: TimelineEventV4 & { date?: string }): string {
  const c = ev.content;
  if (ev.category === '诊断')
    return cleanLabel(c.diagnosis ?? ev.sub_type).slice(0, 24) || '诊断';
  if (ev.category === '病历文书') return cleanLabel(ev.sub_type) || '病历文书';
  if (ev.category === '检查') {
    if (c.exam_class) {
      return `${c.exam_class}${c.exam_sub_class ? `(${c.exam_sub_class})` : ''}`;
    }
    return cleanLabel(ev.sub_type) || '检查';
  }
  if (ev.category === '化验') return cleanLabel(c.subject ?? ev.sub_type).slice(0, 18) || '化验';
  if (ev.category === '医嘱') return cleanLabel(c.order_text ?? ev.sub_type).slice(0, 18) || '医嘱';
  return cleanLabel(ev.sub_type) || '事件';
}

/** 卡片副标题：与主标题重复时不展示（如病历文书标题与 sub_type 相同） */
function getCardSubLine(ev: TimelineEventV4 & { date?: string }, title: string): string | null {
  const sub = cleanLabel(ev.sub_type);
  if (!sub) return null;
  const t = String(title).trim();
  if (sub === t) return null;
  return sub;
}

function getCatEvents(timeline: PatientTimelineV4['timeline'], cat: string): Array<TimelineEventV4 & { date: string }> {
  const arr: Array<TimelineEventV4 & { date: string }> = [];
  timeline.forEach((day) => {
    day.events.forEach((ev) => {
      if (ev.category === cat) arr.push({ date: day.date, ...ev });
    });
  });
  return arr;
}

/** 全部分类事件按时间串联（一条时间线） */
function getMergedTimeline(
  timeline: PatientTimelineV4['timeline'],
  collapsed: Record<string, boolean>
): Array<TimelineEventV4 & { date: string; category: string }> {
  const out: Array<TimelineEventV4 & { date: string; category: string }> = [];
  CAT_ORDER.forEach((cat) => {
    if (collapsed[cat]) return;
    getCatEvents(timeline, cat).forEach((ev) => {
      out.push({ ...ev, category: cat });
    });
  });
  out.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.time || '').localeCompare(b.time || '');
  });
  return out;
}

function riskClass(level?: Patient['riskLevel']) {
  if (level === 'high') return 'pj-v4-risk pj-v4-risk-high';
  if (level === 'medium') return 'pj-v4-risk pj-v4-risk-medium';
  return 'pj-v4-risk pj-v4-risk-low';
}

function riskLabel(level?: Patient['riskLevel']) {
  const m = { high: '高危', medium: '中危', low: '低危' };
  return level ? m[level] : '';
}

interface Props {
  listPatient: Patient;
  data: PatientTimelineV4 | null;
  loading?: boolean;
}

export default function PatientJourneyV4({ listPatient, data, loading }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [ttPos, setTtPos] = useState<{ left: number; top: number } | null>(null);
  const [collapsedCat, setCollapsedCat] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CAT_ORDER.map((c) => [c, false])) as Record<string, boolean>
  );
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const closeTooltip = useCallback(() => {
    setActiveKey(null);
    setTtPos(null);
  }, []);

  useEffect(() => {
    if (!activeKey || !ttPos) return;
    const onScroll = () => closeTooltip();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [activeKey, ttPos, closeTooltip]);

  const mergedEvents = useMemo(
    () => (data ? getMergedTimeline(data.timeline, collapsedCat) : []),
    [data, collapsedCat]
  );

  const fullMergedEvents = useMemo(
    () => (data ? getMergedTimeline(data.timeline, NO_COLLAPSE) : []),
    [data]
  );

  const journeySvg = useMemo(() => buildMergedJourneySvg(mergedEvents, CAT_CFG), [mergedEvents]);

  /** 仅用于左侧分类按钮垂直位置（与折叠状态无关） */
  const refJourneySvg = useMemo(
    () => buildMergedJourneySvg(fullMergedEvents, CAT_CFG),
    [fullMergedEvents]
  );

  const [svgH, setSvgH] = useState(journeySvg.svgH);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setSvgH(journeySvg.svgH);
  }, [journeySvg.svgH, journeySvg.nodes.length]);

  useLayoutEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap || journeySvg.nodes.length === 0) return;
    let maxBottom = 0;
    wrap.querySelectorAll('.pj-v4-tl-card').forEach((c) => {
      const el = c as HTMLElement;
      maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
    });
    if (maxBottom > 0) {
      setSvgH((h) => Math.max(h, maxBottom + 20));
    }
  }, [journeySvg.nodes, mergedEvents]);

  const onNodeClick = useCallback(
    (e: React.MouseEvent, key: string, gIdx: number) => {
      e.stopPropagation();
      if (!data) return;
      if (activeKey === key) {
        closeTooltip();
        return;
      }
      if (!mergedEvents[gIdx]) return;

      setActiveKey(key);
      const el = nodeRefs.current[key];
      if (el) {
        const rect = el.getBoundingClientRect();
        const ttW = 300;
        const ttH = 260;
        let left = rect.left + rect.width / 2 - ttW / 2;
        let top = rect.bottom + 8;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (left + ttW > w - 12) left = w - ttW - 12;
        if (left < 12) left = 12;
        if (top + ttH > h - 12) top = rect.top - ttH - 8;
        if (top < 8) top = 8;
        setTtPos({ left, top });
      }
    },
    [data, activeKey, closeTooltip, mergedEvents]
  );

  const activeEvent = useMemo(() => {
    if (!activeKey || !data) return null;
    const [prefix, idxStr] = activeKey.split('::');
    if (prefix !== 'mj') return null;
    const gIdx = parseInt(idxStr, 10);
    if (Number.isNaN(gIdx)) return null;
    const ev = mergedEvents[gIdx];
    if (!ev) return null;
    const cat = ev.category;
    return { ev, cat, cfg: CAT_CFG[cat] };
  }, [activeKey, data, mergedEvents]);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCat((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const colHeight = Math.max(
    refJourneySvg.svgH,
    journeySvg.svgH,
    svgH,
    mergedEvents.length === 0 ? 200 : 0
  );
  const pillCenterY = useMemo(
    () =>
      computeCategoryPillCenters(refJourneySvg.nodes, CAT_ORDER, colHeight, JOURNEY_SVG.CARD_H_EST),
    [refJourneySvg.nodes, colHeight]
  );

  if (loading) {
    return (
      <div className="pj-v4" style={{ justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div className="journey-empty">正在加载患者时间线…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pj-v4" style={{ justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div className="journey-empty">暂无时间线数据。请更换患者，或确认该患者已接入病程数据。</div>
      </div>
    );
  }

  const pd = data.patient;
  const sum = data.summary;

  return (
    <div className="pj-v4">
      <header className="pj-v4-journey-header pj-v4-journey-header--compact">
        <div className="pj-v4-info">
          <div className="pj-v4-name-row">
            <span className="pj-v4-name">{listPatient.name}</span>
            <span className="pj-v4-tag">{pd.sex}</span>
            <span className="pj-v4-tag">{pd.age}岁</span>
            <span className="pj-v4-tag pj-v4-tag-green">{listPatient.admissionId}</span>
            {listPatient.tags.map((t) => (
              <span key={t} className="pj-v4-tag">
                {t}
              </span>
            ))}
            {listPatient.riskLevel && (
              <span className={riskClass(listPatient.riskLevel)} style={{ fontSize: 11, padding: '2px 8px' }}>
                {riskLabel(listPatient.riskLevel)}
              </span>
            )}
          </div>
          <div className="pj-v4-meta">
            {pd.date_of_birth && (
              <>
                <span>出生：{pd.date_of_birth}</span>
                <span className="pj-v4-sep">|</span>
              </>
            )}
            <span>
              住院：{pd.admission_date} → {pd.discharge_date}（{pd.total_days}天）
            </span>
            <span className="pj-v4-sep">|</span>
            <span>入院诊断：{pd.admission_diagnosis}</span>
            <span className="pj-v4-sep">|</span>
            <span className="pj-v4-meta-kv-black">出院：{pd.discharge_diagnosis}</span>
            <span className="pj-v4-sep">|</span>
            <span className="pj-v4-meta-kv-black">结果：{pd.treatment_result}</span>
          </div>
        </div>
        <div className="pj-v4-stat-boxes">
          <div className="pj-v4-stat-box">
            <div className="pj-v4-stat-value-row">
              <span className="pj-v4-stat-num">{sum?.total_events ?? '—'}</span>
              <span className="pj-v4-stat-unit">次</span>
            </div>
            <div className="pj-v4-stat-label">全程事件</div>
          </div>
          <div className="pj-v4-stat-box">
            <div className="pj-v4-stat-value-row">
              <span className="pj-v4-stat-num">{sum?.event_types?.['检查'] ?? '—'}</span>
              <span className="pj-v4-stat-unit">次</span>
            </div>
            <div className="pj-v4-stat-label">检查</div>
          </div>
          <div className="pj-v4-stat-box">
            <div className="pj-v4-stat-value-row">
              <span className="pj-v4-stat-num">{sum?.event_types?.['化验'] ?? '—'}</span>
              <span className="pj-v4-stat-unit">次</span>
            </div>
            <div className="pj-v4-stat-label">化验</div>
          </div>
          <div className="pj-v4-stat-box">
            <div className="pj-v4-stat-value-row">
              <span className="pj-v4-stat-num">{pd.total_days}</span>
              <span className="pj-v4-stat-unit">天</span>
            </div>
            <div className="pj-v4-stat-label">住院天数</div>
          </div>
        </div>
      </header>

      <div className="pj-v4-toolbar">
        <div className="pj-v4-legend">
          {CAT_ORDER.map((cat) => {
            const cfg = CAT_CFG[cat];
            return (
              <span key={cat} className="pj-v4-legend-item" title={`时间线颜色：${cat}`}>
                <span
                  className="pj-v4-legend-dot"
                  style={{
                    background: cfg.cardBg,
                    border: `2px solid ${cfg.trackColor}`,
                    boxShadow: `inset 0 0 0 1px ${cfg.color}33`,
                  }}
                />
                {cat}
              </span>
            );
          })}
          <span className="pj-v4-legend-sep" aria-hidden />
          <span className="pj-v4-legend-item pj-v4-legend-item--anomaly">
            <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>⬆</span>
            异常指标
          </span>
        </div>
      </div>

      <div
        className="pj-v4-scroll"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.pj-v4-tl-card')) closeTooltip();
        }}
      >
        <div className="pj-v4-unified-wrap">
          <div
            className="pj-v4-cat-label-col pj-v4-cat-label-col--left"
            style={{ height: colHeight, minHeight: colHeight }}
            aria-label="旅程分类"
          >
            {CAT_ORDER.map((cat) => {
              const cfg = CAT_CFG[cat];
              const hidden = collapsedCat[cat];
              return (
                <div
                  key={cat}
                  className="pj-v4-cat-pill-anchor"
                  style={{ top: pillCenterY[cat] ?? 0 }}
                >
                  <button
                    type="button"
                    aria-pressed={!hidden}
                    className={`pj-v4-cat-pill ${hidden ? 'pj-v4-cat-pill--collapsed' : ''}`}
                    onClick={() => toggleCategory(cat)}
                    title={hidden ? `展开画板内「${cat}」旅程` : `收起画板内「${cat}」旅程`}
                  >
                    <span className="pj-v4-cat-pill-text" style={{ color: cfg.color }}>
                      {cat}
                    </span>
                    <span className="pj-v4-cat-pill-chev" aria-hidden>
                      {hidden ? '▶' : '▼'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pj-v4-cat-track pj-v4-cat-track--unified">
            {mergedEvents.length === 0 ? (
              <div className="pj-v4-empty-timeline">暂无事件（可点击左侧类别标签恢复显示）</div>
            ) : (
              <div
                ref={svgWrapRef}
                className="pj-v4-svg-canvas-wrap"
                style={{
                  width: journeySvg.svgW,
                  minWidth: journeySvg.svgW,
                  minHeight: svgH,
                }}
              >
                <svg
                  className="pj-v4-svg-timeline"
                  width={journeySvg.svgW}
                  height={svgH}
                  style={{ overflow: 'visible' }}
                  aria-hidden={false}
                >
                  {journeySvg.pathSegs.map((seg) => (
                    <path
                      key={seg.key}
                      d={seg.d}
                      fill="none"
                      stroke={seg.stroke}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {journeySvg.nodes.map((n) => {
                    const cfg = CAT_CFG[n.ev.category]!;
                    const stemY2 = n.goUp ? n.y - JOURNEY_SVG.STEM_LEN : n.y + JOURNEY_SVG.STEM_LEN;
                    const arrowDir = n.goUp ? -1 : 1;
                    const ay = stemY2;
                    const tip = JOURNEY_SVG.ARROW_TIP_OFFSET;
                    return (
                      <g key={n.key}>
                        <line
                          x1={n.x}
                          y1={n.y}
                          x2={n.x}
                          y2={stemY2}
                          stroke={cfg.trackColor}
                          strokeWidth={1.5}
                        />
                        <polygon
                          points={`${n.x},${ay + arrowDir * tip} ${n.x - 4},${ay - arrowDir * 3} ${n.x + 4},${ay - arrowDir * 3}`}
                          fill={cfg.color}
                          fillOpacity={0.75}
                        />
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={6}
                          fill="white"
                          stroke={cfg.color}
                          strokeWidth={2.5}
                          style={{ cursor: 'pointer' }}
                        />
                        {/* 卡片在上方 → 时间放在节点/横线下方；卡片在下方 → 时间放在节点/横线上方 */}
                        <text
                          x={n.x}
                          y={n.goUp ? n.y + 20 : n.y - 10}
                          textAnchor="middle"
                          fontSize={12}
                          fill="#666"
                          fontWeight={500}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {n.ev.date.slice(5)} {n.ev.time}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {journeySvg.nodes.map((n) => {
                  const cfg = CAT_CFG[n.ev.category]!;
                  const content = n.ev.content;
                  const abnormalCount =
                    typeof content.abnormal_count === 'number' ? content.abnormal_count : 0;
                  const title = getTitle(n.ev);
                  const subLine = getCardSubLine(n.ev, title);
                  const isActive = activeKey === n.key;
                  /** 上方卡片：底边对齐箭头尖（见 journeySvgLayout cardBottomY），避免矮卡片与箭头间大缝 */
                  const cardPosStyle: CSSProperties =
                    n.goUp && n.cardBottomY != null
                      ? {
                          left: n.x - JOURNEY_SVG.CARD_W / 2,
                          width: JOURNEY_SVG.CARD_W,
                          bottom: svgH - n.cardBottomY,
                          top: 'auto',
                        }
                      : {
                          left: n.x - JOURNEY_SVG.CARD_W / 2,
                          width: JOURNEY_SVG.CARD_W,
                          top: n.cardTop,
                          bottom: 'auto',
                        };
                  return (
                    <div
                      key={`card-${n.key}`}
                      ref={(el) => {
                        nodeRefs.current[n.key] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      className={`pj-v4-tl-card ${isActive ? 'pj-v4-tl-card--active' : ''}`}
                      style={{
                        ...cardPosStyle,
                        borderTop: `2px solid ${cfg.color}`,
                        background: cfg.cardBg,
                        borderColor: cfg.trackColor,
                      }}
                      onClick={(e) => onNodeClick(e, n.key, n.gIdx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNodeClick(e as unknown as React.MouseEvent, n.key, n.gIdx);
                        }
                      }}
                    >
                      <div className="pj-v4-tl-card-title">{esc(title)}</div>
                      {subLine != null && subLine !== '' && (
                        <div className="pj-v4-tl-card-sub">{esc(subLine)}</div>
                      )}
                      {abnormalCount > 0 && (
                        <div className="pj-v4-tl-card-anomaly">⬆ {abnormalCount}项异常</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeEvent && ttPos && (
        <>
          <div className="pj-v4-tt-overlay pj-v4-visible" onClick={closeTooltip} aria-hidden />
          <div className="pj-v4-tooltip" style={{ left: ttPos.left, top: ttPos.top }}>
            <TooltipBody ev={activeEvent.ev} cat={activeEvent.cat} cfg={activeEvent.cfg} onClose={closeTooltip} />
          </div>
        </>
      )}
    </div>
  );
}

function TooltipBody({
  ev,
  cat,
  cfg,
  onClose,
}: {
  ev: TimelineEventV4 & { date: string };
  cat: string;
  cfg: { color: string; trackColor: string; cardBg?: string };
  onClose: () => void;
}) {
  const c = ev.content;

  let body: React.ReactNode = null;

  if (cat === '化验' && Array.isArray(c.items)) {
    body = (
      <>
        <div>
          {c.items.map((item, i) => {
            const isH = item.abnormal === 'H';
            const isL = item.abnormal === 'L';
            return (
              <div key={i} className="pj-v4-tt-lab-row">
                <span style={{ flex: 1, color: 'var(--pj-text-mid)' }}>{esc(item.name)}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: isH ? '#c0392b' : isL ? '#2980b9' : undefined,
                  }}
                >
                  {esc(item.result)}
                  {item.unit ? ` ${esc(item.unit)}` : ''}
                  {isH ? ' ↑' : isL ? ' ↓' : ''}
                </span>
                <span style={{ color: 'var(--pj-text-light)', fontSize: 10 }}>{esc(item.reference ?? '')}</span>
              </div>
            );
          })}
        </div>
        {c.abnormal_count != null && c.abnormal_count > 0 && Array.isArray(c.abnormal_items) && c.abnormal_items.length > 0 && (
          <div className="pj-v4-tt-anomaly-box">
            存在异常指标：{c.abnormal_items.map((x) => esc(x)).join('；')}
          </div>
        )}
      </>
    );
  } else if (cat === '检查') {
    body = (
      <>
        {c.impression && (
          <div className="pj-v4-tt-kv">
            <span className="pj-v4-tt-k">结论：</span>
            <span className="pj-v4-tt-v">{esc(String(c.impression))}</span>
          </div>
        )}
        {c.recommendation && (
          <div className="pj-v4-tt-kv" style={{ marginTop: 5 }}>
            <span className="pj-v4-tt-k">建议：</span>
            <span className="pj-v4-tt-v">{esc(String(c.recommendation))}</span>
          </div>
        )}
      </>
    );
  } else if (cat === '病历文书') {
    body = (
      <div className="pj-v4-tt-v" style={{ fontSize: 12, lineHeight: 1.6, color: '#444' }}>
        {esc(c.summary ?? '')}
      </div>
    );
  } else if (cat === '诊断') {
    body = (
      <>
        <div className="pj-v4-tt-kv">
          <span className="pj-v4-tt-k">类型：</span>
          <span className="pj-v4-tt-v">{esc(ev.sub_type)}</span>
        </div>
        <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
          <span className="pj-v4-tt-k">内容：</span>
          <span className="pj-v4-tt-v" style={{ fontWeight: 600 }}>
            {esc(String(c.diagnosis ?? '-'))}
          </span>
        </div>
        {c.treat_result != null && c.treat_result !== '' && (
          <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
            <span className="pj-v4-tt-k">结果：</span>
            <span className="pj-v4-tt-v">{esc(String(c.treat_result))}</span>
          </div>
        )}
        {c.with_surgery === true && (
          <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
            <span className="pj-v4-tt-k">手术：</span>
            <span className="pj-v4-tt-v">含手术</span>
          </div>
        )}
      </>
    );
  } else if (cat === '医嘱') {
    body = (
      <>
        <div className="pj-v4-tt-kv">
          <span className="pj-v4-tt-k">医嘱：</span>
          <span className="pj-v4-tt-v" style={{ fontWeight: 600 }}>
            {esc(String(c.order_text ?? '-'))}
          </span>
        </div>
        <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
          <span className="pj-v4-tt-k">类型：</span>
          <span className="pj-v4-tt-v">{esc(String(c.class ?? ev.sub_type))}</span>
        </div>
        {c.dosage && (
          <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
            <span className="pj-v4-tt-k">剂量：</span>
            <span className="pj-v4-tt-v">
              {esc(String(c.dosage))}
              {c.route ? ` ${esc(String(c.route))}` : ''}
            </span>
          </div>
        )}
        {c.stop_datetime && (
          <div className="pj-v4-tt-kv" style={{ marginTop: 4 }}>
            <span className="pj-v4-tt-k">停止：</span>
            <span className="pj-v4-tt-v">{esc(String(c.stop_datetime))}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="pj-v4-tt-header">
        <span className="pj-v4-tt-dot" style={{ background: cfg.color }} />
        <span className="pj-v4-tt-title">{esc(getTitle(ev))}</span>
        <button type="button" className="pj-v4-tt-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>
      <div className="pj-v4-tt-body">
        {body}
        <div className="pj-v4-tt-time">
          {esc(ev.date)} {esc(ev.time)}
        </div>
      </div>
    </>
  );
}
