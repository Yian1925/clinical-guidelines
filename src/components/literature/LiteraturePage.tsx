import { useMemo, useState, useEffect, useRef } from 'react';
import type {
  EvidenceGradeCode,
  LiteratureEvidenceCategory,
  LiteratureEvidenceItem,
  StudyDesignCode,
} from '../../types';
import { LITERATURE_EVIDENCE } from '../../data/literature';
import { EVIDENCE_GRADE_LABEL, STUDY_DESIGN_LABEL } from '../../constants/literatureEbm';
import { useAppStore } from '../../store';
import { roleButtonActivate } from '../../utils/keyboard';
import '../../styles/literature.css';

const CATEGORY_OPTIONS: { value: LiteratureEvidenceCategory | ''; label: string }[] = [
  { value: '', label: '全部归纳类型' },
  { value: 'special_pop', label: '特殊人群策略' },
  { value: 'scheme_compare', label: '方案比较依据' },
  { value: 'boundary', label: '适用边界提示' },
  { value: 'outcome', label: '关键结局摘要' },
];

const DIMENSION_META: {
  key: keyof Pick<
    LiteratureEvidenceItem,
    'researchObject' | 'strategy' | 'applicableConditions' | 'keyResults'
  >;
  title: string;
  hint: string;
  tone: 'blue' | 'teal' | 'amber' | 'violet';
}[] = [
  { key: 'researchObject', title: '研究对象', hint: '什么患者 / 阶段 / 特征', tone: 'blue' },
  { key: 'strategy', title: '处理策略', hint: '检查、治疗或管理动作', tone: 'teal' },
  { key: 'applicableConditions', title: '适用条件', hint: '何时适用 / 不适用 / 前提', tone: 'amber' },
  { key: 'keyResults', title: '关键结果', hint: '疗效、安全性、转归或策略差异', tone: 'violet' },
];

function categoryBadgeClass(cat: LiteratureEvidenceCategory): string {
  const m: Record<LiteratureEvidenceCategory, string> = {
    special_pop: 'lit-cat lit-cat--pop',
    scheme_compare: 'lit-cat lit-cat--compare',
    boundary: 'lit-cat lit-cat--boundary',
    outcome: 'lit-cat lit-cat--outcome',
  };
  return m[cat];
}

function categoryLabel(cat: LiteratureEvidenceCategory): string {
  const m: Record<LiteratureEvidenceCategory, string> = {
    special_pop: '特殊人群策略',
    scheme_compare: '方案比较依据',
    boundary: '适用边界提示',
    outcome: '关键结局摘要',
  };
  return m[cat];
}

const GRADE_OPTIONS: { value: EvidenceGradeCode | ''; label: string }[] = [
  { value: '', label: '全部证据等级' },
  ...(['high', 'moderate', 'low', 'very_low'] as const).map((g) => ({
    value: g,
    label: EVIDENCE_GRADE_LABEL[g],
  })),
];

const STUDY_DESIGN_ORDER: StudyDesignCode[] = [
  'rct',
  'systematic_review_meta',
  'cohort',
  'case_control',
  'case_series',
  'narrative_review',
  'pooled_analysis',
];

const DESIGN_OPTIONS: { value: StudyDesignCode | ''; label: string }[] = [
  { value: '', label: '全部研究设计' },
  ...STUDY_DESIGN_ORDER.map((value) => ({ value, label: STUDY_DESIGN_LABEL[value] })),
];

export default function LiteraturePage() {
  const {
    page: routePage,
    setPage,
    synthesisEntryTarget,
    setSynthesisEntryTarget,
    chatEntryTarget,
    setChatEntryTarget,
    literatureFocusEvidenceId,
    setLiteratureFocusEvidenceId,
    literatureDeepLink,
    setLiteratureDeepLink,
  } = useAppStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<LiteratureEvidenceCategory | ''>('');
  const [gradeFilter, setGradeFilter] = useState<EvidenceGradeCode | ''>('');
  const [designFilter, setDesignFilter] = useState<StudyDesignCode | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 综合展示进入时限定列表；null 表示不限制 */
  const [synthesisRestrictIds, setSynthesisRestrictIds] = useState<string[] | null>(null);
  const [showBackToSynthesis, setShowBackToSynthesis] = useState(false);
  const [showBackToChat, setShowBackToChat] = useState(false);
  const prevRouteRef = useRef(routePage);

  useEffect(() => {
    if (routePage === 'literature') {
      setShowBackToSynthesis(prevRouteRef.current === 'synthesis' && synthesisEntryTarget === 'literature');
      setShowBackToChat(prevRouteRef.current === 'chat' && chatEntryTarget === 'literature');
    }
    prevRouteRef.current = routePage;
  }, [routePage, synthesisEntryTarget, chatEntryTarget]);

  useEffect(() => {
    if (routePage !== 'literature') {
      setSynthesisRestrictIds(null);
      return;
    }

    if (literatureDeepLink) {
      const { restrictToEvidenceIds, focusEvidenceId } = literatureDeepLink;
      setLiteratureDeepLink(null);
      setQ('');
      setCat('');
      setGradeFilter('');
      setDesignFilter('');
      const validIds = restrictToEvidenceIds.filter((id) => LITERATURE_EVIDENCE.some((e) => e.id === id));
      setSynthesisRestrictIds(validIds.length > 0 ? validIds : null);
      const focus =
        focusEvidenceId && validIds.includes(focusEvidenceId) ? focusEvidenceId : (validIds[0] ?? null);
      setSelectedId(focus);
      return;
    }

    if (!literatureFocusEvidenceId) return;
    const id = literatureFocusEvidenceId;
    setLiteratureFocusEvidenceId(null);
    if (!LITERATURE_EVIDENCE.some((e) => e.id === id)) return;
    setQ('');
    setCat('');
    setGradeFilter('');
    setDesignFilter('');
    setSynthesisRestrictIds(null);
    setSelectedId(id);
  }, [
    routePage,
    literatureDeepLink,
    literatureFocusEvidenceId,
    setLiteratureDeepLink,
    setLiteratureFocusEvidenceId,
  ]);

  const filtered = useMemo(() => {
    const pool =
      synthesisRestrictIds != null && synthesisRestrictIds.length > 0
        ? LITERATURE_EVIDENCE.filter((e) => synthesisRestrictIds.includes(e.id))
        : LITERATURE_EVIDENCE;
    const qq = q.trim().toLowerCase();
    return pool.filter((ev) => {
      if (cat && ev.category !== cat) return false;
      if (gradeFilter && ev.evidenceGrade !== gradeFilter) return false;
      if (designFilter && ev.studyDesign !== designFilter) return false;
      if (!qq) return true;
      const blob = `${ev.title} ${ev.thesis} ${ev.keywords.join(' ')} ${ev.citation}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [q, cat, gradeFilter, designFilter, synthesisRestrictIds]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => (prev && filtered.some((e) => e.id === prev) ? prev : filtered[0].id));
  }, [filtered]);

  const selected = useMemo(
    () => (selectedId ? LITERATURE_EVIDENCE.find((e) => e.id === selectedId) ?? null : null),
    [selectedId]
  );

  return (
    <div className="lit-page">
      <header className="lit-page-head">
        <div className="lit-page-head-row">
          <h2 className="lit-page-title">文献证据库</h2>
          {showBackToSynthesis ? (
            <button
              type="button"
              className="lit-back-synthesis"
              onClick={() => {
                setSynthesisEntryTarget(null);
                setPage('synthesis');
              }}
            >
              返回综合展示
            </button>
          ) : showBackToChat ? (
            <button
              type="button"
              className="lit-back-synthesis"
              onClick={() => {
                setChatEntryTarget(null);
                setPage('chat');
              }}
            >
              返回Agent问答
            </button>
          ) : null}
        </div>
        <div className="lit-toolbar lit-toolbar--wrap">
          <input
            type="search"
            className="lit-search"
            placeholder="搜索标题、关键词、期刊…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="搜索文献证据"
          />
          <select
            className="lit-select"
            value={cat}
            onChange={(e) => setCat(e.target.value as LiteratureEvidenceCategory | '')}
            aria-label="归纳类型"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="lit-select"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as EvidenceGradeCode | '')}
            aria-label="证据等级"
          >
            {GRADE_OPTIONS.map((o) => (
              <option key={o.value || 'all-g'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="lit-select"
            value={designFilter}
            onChange={(e) => setDesignFilter(e.target.value as StudyDesignCode | '')}
            aria-label="研究设计"
          >
            {DESIGN_OPTIONS.map((o) => (
              <option key={o.value || 'all-d'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {synthesisRestrictIds != null && synthesisRestrictIds.length > 0 ? (
          <div className="lit-synthesis-scope" role="status">
            <span className="lit-synthesis-scope-text">
              当前列表已限定为本阶段关联证据（{synthesisRestrictIds.length} 条）
            </span>
            <button type="button" className="lit-synthesis-scope-clear" onClick={() => setSynthesisRestrictIds(null)}>
              显示全部条目
            </button>
          </div>
        ) : null}
      </header>

      <div className="lit-split">
        <nav className="lit-list" aria-label="证据条目列表">
          {filtered.length === 0 ? (
            <div className="lit-list-empty">无匹配条目，请调整筛选或关键词。</div>
          ) : (
            <ul className="lit-list-ul">
              {filtered.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className={`lit-list-item ${selectedId === ev.id ? 'lit-list-item--active' : ''}`}
                    onClick={() => setSelectedId(ev.id)}
                    onKeyDown={(e) => roleButtonActivate(e, () => setSelectedId(ev.id))}
                  >
                    <span className={categoryBadgeClass(ev.category)}>{categoryLabel(ev.category)}</span>
                    <span className="lit-list-ebm">
                      <span className={`lit-grade lit-grade--${ev.evidenceGrade}`}>{EVIDENCE_GRADE_LABEL[ev.evidenceGrade]}</span>
                      <span className="lit-design">{STUDY_DESIGN_LABEL[ev.studyDesign]}</span>
                    </span>
                    <span className="lit-list-item-title">{ev.title}</span>
                    <span className="lit-list-item-thesis">{ev.thesis}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <section className="lit-detail" aria-live="polite">
          {!selected ? (
            <div className="lit-detail-empty">请选择左侧条目。</div>
          ) : (
            <>
              <div className="lit-detail-header">
                <div className="lit-detail-badges">
                  <span className={categoryBadgeClass(selected.category)}>{categoryLabel(selected.category)}</span>
                  <span className={`lit-grade lit-grade--${selected.evidenceGrade}`}>{EVIDENCE_GRADE_LABEL[selected.evidenceGrade]}</span>
                  <span className="lit-design lit-design--inline">{STUDY_DESIGN_LABEL[selected.studyDesign]}</span>
                </div>
                <h3 className="lit-detail-title">{selected.title}</h3>
                <p className="lit-detail-thesis">{selected.thesis}</p>
                <div className="lit-detail-kw">
                  {selected.keywords.map((k) => (
                    <span key={k} className="lit-kw">
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lit-dim-grid">
                {DIMENSION_META.map((dim) => (
                  <article key={dim.key} className={`lit-dim lit-dim--${dim.tone}`}>
                    <div className="lit-dim-head">
                      <span className="lit-dim-title">{dim.title}</span>
                      <span className="lit-dim-hint">{dim.hint}</span>
                    </div>
                    <p className="lit-dim-body">{selected[dim.key]}</p>
                  </article>
                ))}
              </div>

              <footer className="lit-source">
                <div className="lit-source-label">来源</div>
                <p className="lit-source-cite">{selected.citation}</p>
                <p className="lit-source-meta">
                  {selected.journal && <span>{selected.journal}</span>}
                  {selected.year != null && <span> · {selected.year}</span>}
                  {selected.doi && (
                    <span>
                      {' '}
                      · DOI{' '}
                      <a href={`https://doi.org/${selected.doi}`} target="_blank" rel="noreferrer">
                        {selected.doi}
                      </a>
                    </span>
                  )}
                </p>
              </footer>

              {selected.guidelineAlignment ? (
                <aside className="lit-alignment" aria-label="指南路径对齐元数据">
                  <div className="lit-alignment-title">指南路径对齐（元数据）</div>
                  <p className="lit-alignment-note">
                    供多源路径匹配与<strong>综合展示层</strong>使用：将文献片段与指南目录、阶段/节点语义对齐，而非在本页跳转。
                  </p>
                  <dl className="lit-alignment-dl">
                    <div>
                      <dt>目录挂载 tocId</dt>
                      <dd><code className="lit-code">{selected.guidelineAlignment.tocId}</code></dd>
                    </div>
                    {selected.guidelineAlignment.stageHint ? (
                      <div>
                        <dt>路径阶段 hint</dt>
                        <dd>{selected.guidelineAlignment.stageHint}</dd>
                      </div>
                    ) : null}
                    {selected.guidelineAlignment.nodeHint ? (
                      <div>
                        <dt>节点 / 主题 hint</dt>
                        <dd>{selected.guidelineAlignment.nodeHint}</dd>
                      </div>
                    ) : null}
                  </dl>
                </aside>
              ) : null}
            </>
          )}
        </section>
      </div>

      <p className="lit-footnote">
        证据等级采用 GRADE 四档示意；正式环境应经系统评价流程降级/升级并记录依据。研究设计标签用于分层，不等同于证据确定性本身。
      </p>
    </div>
  );
}
