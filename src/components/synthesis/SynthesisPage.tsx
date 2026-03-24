import { useMemo, useState, useEffect } from 'react';
import { DISEASE_SYNTHESIS_TRACKS } from '../../data/synthesis';
import { LITERATURE_EVIDENCE } from '../../data/literature';
import { PATIENTS } from '../../data/emr/patients';
import { useAppStore } from '../../store';
import { useAgent } from '../../hooks/useAgent';
import { EVIDENCE_GRADE_LABEL, STUDY_DESIGN_LABEL } from '../../constants/literatureEbm';
import { roleButtonActivate } from '../../utils/keyboard';
import '../../styles/synthesis.css';

function buildEvidenceClinicalSummary(trackId: string, stageId: string, rows: typeof LITERATURE_EVIDENCE): string {
  if (rows.length === 0) return '当前阶段缺少可用证据，建议以指南路径与多学科评估作为主要决策依据。';

  if (trackId === 'cervical' && stageId === 'cx-assess') {
    return '初评阶段优先保证分期准确性与可切除性判断：先完成病理与影像协同评估，再进入手术或根治性放化疗路径，避免因分期偏差导致策略失配。';
  }
  if (trackId === 'cervical' && stageId === 'cx-early') {
    return '早期宫颈癌以根治性手术为主，是否扩大或收缩治疗强度取决于病理危险分层；保留生育等方案仅适用于严格筛选人群。';
  }
  if (trackId === 'cervical' && stageId === 'cx-locally-advanced') {
    return '对局部晚期宫颈癌，核心路径仍是同期含铂放化疗；在符合适应证且免疫禁忌可控时，可考虑联合免疫并加强免疫相关不良反应监测。';
  }
  if (trackId === 'cervical' && stageId === 'cx-special-follow') {
    return '对妊娠合并宫颈癌等特殊场景，证据支持以母胎风险与肿瘤进展风险并行评估，采用严格分层后的个体化策略，不宜机械套用常规路径。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-assess') {
    return '乳腺癌初评阶段关键在分子分型质量：HER2 与 HR 判读结果直接决定后续系统治疗路径，诊疗上应先确保病理一致性，再做治疗分层。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-local-surgery') {
    return '可手术早期乳腺癌应先确定局部治疗边界（乳房与腋窝），再按亚型与复发风险配置辅助治疗，避免局部和全身策略割裂。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-bcs-rt') {
    return '保乳术后总体仍以全乳放疗为标准；仅在高龄、HR阳性、低危且可确保内分泌依从性的患者中，才可讨论省略放疗，并需明确复发风险增幅。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-advanced-her2low') {
    return '对HR+/HER2-low晚期患者，内分泌经治进展后可考虑ADC升级路径；决策前应确认HER2-low判读并建立ILD/肺炎的早筛和停药处置流程。';
  }

  const highCount = rows.filter((r) => r.evidenceGrade === 'high').length;
  if (highCount > 0) {
    return '现有证据支持在指南主路径上进行分层治疗：先按适应证与既往治疗线数确定治疗强度，再按关键不良反应风险做动态监测与调整。';
  }
  return '现有证据多为低至中等确定性，建议优先采用指南标准策略，并在疗效与安全性监测基础上谨慎个体化调整。';
}

function buildInstitutionClinicalSummary(trackId: string, stageId: string, matchedCaseCount: number): string {
  if (trackId === 'cervical' && stageId === 'cx-assess') {
    return '院内执行重点是把影像—病理—分期讨论前置到首次决策，先统一分期结论，再决定进入手术或放化疗路径。';
  }
  if (trackId === 'cervical' && stageId === 'cx-early') {
    return '院内路径建议在一次 MDT 内联动完成手术、放疗与术后随访计划，减少治疗切换造成的延迟。';
  }
  if (trackId === 'cervical' && stageId === 'cx-locally-advanced') {
    return '局晚期阶段应将放疗计划、同期化疗节奏与毒性监测一体化管理；若联合免疫，需建立免疫不良反应快速处置机制。';
  }
  if (trackId === 'cervical' && stageId === 'cx-special-follow') {
    return '特殊人群与复发转移病例建议走多学科会诊与伦理评估并行路径，核心是控制肿瘤风险同时维持治疗连续性。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-assess') {
    return '院内应优先保证病理复核与分型一致性，确保 HER2/HR 结果可直接驱动后续系统治疗选择。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-local-surgery') {
    return '本阶段院内路径强调外科、放疗与内科同轮决策：先定局部控制方案，再同步确定辅助治疗与随访节奏。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-bcs-rt') {
    return '保乳术后路径重点是低危省略放疗的适应证核对与知情沟通质控，避免不恰当外推。';
  }
  if (trackId === 'breast-ibc' && stageId === 'br-advanced-her2low') {
    return '晚期阶段院内执行核心是 HER2-low 复核、给药前肺评估与治疗中毒性监测，减少因不良反应导致的非计划停药。';
  }
  return matchedCaseCount > 0
    ? '院内病例可支持该病种路径执行，建议在指南框架下按本地流程能力进行分层管理。'
    : '当前病种院内样本有限，建议以指南标准路径为主并持续补充真实世界验证。';
}

export default function SynthesisPage() {
  const {
    setPage,
    setGuidelineTocId,
    setLiteratureFocusEvidenceId,
    setLiteratureDeepLink,
    setPatientsListDeepLink,
    setSynthesisEntryTarget,
  } = useAppStore();
  const { askQuestion } = useAgent();

  const [diseaseId, setDiseaseId] = useState(DISEASE_SYNTHESIS_TRACKS[0]?.id ?? '');
  const [stageId, setStageId] = useState<string>('');

  const track = useMemo(
    () => DISEASE_SYNTHESIS_TRACKS.find((t) => t.id === diseaseId) ?? DISEASE_SYNTHESIS_TRACKS[0],
    [diseaseId]
  );

  const stagesSorted = useMemo(() => {
    if (!track) return [];
    return [...track.stages].sort((a, b) => a.order - b.order);
  }, [track]);

  const stage = useMemo(() => stagesSorted.find((s) => s.id === stageId) ?? stagesSorted[0] ?? null, [stagesSorted, stageId]);

  useEffect(() => {
    if (!track) return;
    if (!stageId || !track.stages.some((s) => s.id === stageId)) {
      const first = [...track.stages].sort((a, b) => a.order - b.order)[0];
      if (first) setStageId(first.id);
    }
  }, [track, stageId]);

  const literatureRows = useMemo(() => {
    if (!stage) return [];
    return stage.literatureIds
      .map((id) => LITERATURE_EVIDENCE.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
  }, [stage]);
  const diseaseLiteratureRows = useMemo(
    () => LITERATURE_EVIDENCE.filter((e) => e.guidelineAlignment?.tocId === track?.guidelineTocId),
    [track]
  );
  const displayLiteratureRows = literatureRows.length > 0 ? literatureRows : diseaseLiteratureRows;
  const evidencePreviewRows = displayLiteratureRows.slice(0, 2);
  const evidenceClinicalSummary = useMemo(
    () => buildEvidenceClinicalSummary(track.id, stage.id, displayLiteratureRows),
    [track.id, stage.id, displayLiteratureRows]
  );
  const diseasePatients = useMemo(() => {
    const keywords = track?.rwdDiagnosisKeywords ?? [];
    if (keywords.length === 0) return [];
    return PATIENTS.filter((p) => {
      const blob = `${p.diagnosis} ${(p.tags ?? []).join(' ')}`.toLowerCase();
      return keywords.some((k) => blob.includes(k.toLowerCase()));
    });
  }, [track]);
  const casePreviewRows = useMemo(() => {
    if (!stage) return [];
    const byAdmission = new Map(diseasePatients.map((p) => [p.admissionId, p]));
    const stageMapped = (stage.rwdDemoAdmissionIds ?? [])
      .map((aid) => byAdmission.get(aid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (stageMapped.length > 0) return stageMapped.slice(0, 2);
    return diseasePatients.slice(0, 2);
  }, [stage, diseasePatients]);
  const institutionClinicalSummary = useMemo(
    () => buildInstitutionClinicalSummary(track.id, stage.id, diseasePatients.length),
    [track.id, stage.id, diseasePatients.length]
  );

  if (!track || !stage) {
    return <div className="syn-page syn-page--empty">暂无综合展示数据。</div>;
  }

  const openGuideline = () => {
    setSynthesisEntryTarget('guidelines');
    setGuidelineTocId(track.guidelineTocId);
    setPage('guidelines');
  };

  const openLiteratureLibrary = () => {
    setLiteratureFocusEvidenceId(null);
    const diseaseLevelIds = LITERATURE_EVIDENCE.filter(
      (e) => e.guidelineAlignment?.tocId === track.guidelineTocId
    ).map((e) => e.id);
    const ids = diseaseLevelIds.length > 0 ? diseaseLevelIds : stage.literatureIds;
    const focusId = stage.literatureIds.find((id) => ids.includes(id)) ?? ids[0] ?? null;
    if (ids.length > 0) {
      setLiteratureDeepLink({
        restrictToEvidenceIds: ids,
        focusEvidenceId: focusId,
      });
    } else {
      setLiteratureDeepLink(null);
    }
    setSynthesisEntryTarget('literature');
    setPage('literature');
  };

  const openLiteratureEntry = (evId: string) => {
    setLiteratureDeepLink(null);
    setLiteratureFocusEvidenceId(evId);
    setSynthesisEntryTarget('literature');
    setPage('literature');
  };

  const openRwdLibrary = () => {
    setPatientsListDeepLink({
      diagnosisKeywords: track.rwdDiagnosisKeywords ?? [],
    });
    setSynthesisEntryTarget('patients');
    setPage('patients');
  };

  const sendOverviewToAgent = () => {
    const q = track.agentOverviewQuestion?.trim();
    if (!q) return;
    setPage('chat');
    askQuestion(`【${track.name}】\n${q}`);
  };

  return (
    <div className="syn-page syn-page--bp">
      <header className="syn-bp-header">
        <h1 className="syn-bp-page-title">综合展示</h1>

        <div className="syn-bp-toolbar">
          <div className="syn-bp-toolbar-primary">
            <label className="syn-bp-disease-label" htmlFor="syn-disease-select">
              专题病种
            </label>
            <select
              id="syn-disease-select"
              className="syn-bp-disease-select"
              value={diseaseId}
              onChange={(e) => {
                const id = e.target.value;
                setDiseaseId(id);
                const t = DISEASE_SYNTHESIS_TRACKS.find((x) => x.id === id);
                const first = t ? [...t.stages].sort((a, b) => a.order - b.order)[0] : undefined;
                if (first) setStageId(first.id);
              }}
            >
              {DISEASE_SYNTHESIS_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="syn-bp-updated syn-bp-updated--inline">{track.lastUpdatedLabel}</span>
          </div>
          <nav className="syn-bp-module-nav" aria-label="系统模块">
            <button type="button" className="syn-bp-inline-action" onClick={openGuideline}>
              诊疗路径
            </button>
            <span className="syn-bp-inline-sep" aria-hidden>
              |
            </span>
            <button type="button" className="syn-bp-inline-action" onClick={openLiteratureLibrary}>
              文献证据
            </button>
            <span className="syn-bp-inline-sep" aria-hidden>
              |
            </span>
            <button type="button" className="syn-bp-inline-action" onClick={openRwdLibrary}>
              电子病历
            </button>
          </nav>
        </div>

        <p className="syn-bp-dek">{track.subtitle}</p>
        <p className="syn-bp-pathway-line">{track.pathwaySourceLabel}</p>
      </header>

      <div className="syn-bp-body">
        <nav className="syn-bp-stage-nav" aria-label="诊疗阶段">
          <div className="syn-bp-stage-nav-title">诊疗阶段</div>
          <ol className="syn-bp-stage-list">
            {stagesSorted.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`syn-bp-stage-item ${stage.id === s.id ? 'syn-bp-stage-item--active' : ''}`}
                  onClick={() => setStageId(s.id)}
                  onKeyDown={(e) => roleButtonActivate(e, () => setStageId(s.id))}
                >
                  <span className="syn-bp-stage-num">{s.order}</span>
                  <span className="syn-bp-stage-label">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
          {track.agentOverviewQuestion ? (
            <button type="button" className="syn-bp-btn syn-bp-btn--agent-block" onClick={sendOverviewToAgent}>
              智能辅助问询
            </button>
          ) : null}
        </nav>

        <main className="syn-bp-main" aria-live="polite">
          <header className="syn-bp-main-head">
            <span className="syn-bp-stage-chip">第 {stage.order} 阶段</span>
            <h2 className="syn-bp-main-title">{stage.title}</h2>
          </header>

          <aside className="syn-bp-keypoints" aria-labelledby="syn-kp-h">
            <div className="syn-bp-keypoints-bar" aria-hidden />
            <div className="syn-bp-keypoints-inner">
              <h3 id="syn-kp-h" className="syn-bp-keypoints-title">
                要点摘要
              </h3>
              <ul className="syn-bp-keypoints-list">
                {stage.keyPoints.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="syn-bp-panel syn-bp-panel--overview" aria-labelledby="syn-sum-h">
            <div className="syn-bp-panel-head">
              <span className="syn-bp-panel-label">概述</span>
              <h3 id="syn-sum-h" className="syn-bp-panel-h">
                本阶段临床概述
              </h3>
            </div>
            <p className="syn-bp-prose">{stage.clinicalSummary}</p>
          </section>

          <section className="syn-bp-panel syn-bp-panel--guide" aria-labelledby="syn-gl-h">
            <div className="syn-bp-panel-head">
              <span className="syn-bp-panel-label">指南</span>
              <h3 id="syn-gl-h" className="syn-bp-panel-h">
                指南推荐要点
              </h3>
            </div>
            <div className="syn-bp-panel-source-row">
              <span className="syn-bp-panel-source">{track.guidelineDataSource}</span>
              <button type="button" className="syn-bp-text-link" onClick={openGuideline}>
                查阅诊疗路径
              </button>
            </div>
            <ul className="syn-bp-list">
              {stage.guidelinePoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>

          <section className="syn-bp-panel syn-bp-panel--ev" aria-labelledby="syn-ev-h">
            <div className="syn-bp-panel-head">
              <span className="syn-bp-panel-label">证据</span>
              <h3 id="syn-ev-h" className="syn-bp-panel-h">
                本阶段文献证据
              </h3>
            </div>
            <div className="syn-bp-panel-source-row">
              <span className="syn-bp-panel-source">{track.literatureDataSource}</span>
              <button type="button" className="syn-bp-text-link" onClick={openLiteratureLibrary}>
                进入文献证据模块
              </button>
            </div>
            {displayLiteratureRows.length === 0 ? (
              <p className="syn-bp-empty-ev">当前病种暂无可展示文献条目。</p>
            ) : (
              <>
                <p className="syn-bp-prose">
                  诊疗归纳：{evidenceClinicalSummary}
                </p>
                <ul className="syn-bp-ev-list">
                  {evidencePreviewRows.map((ev) => (
                    <li key={ev.id} className="syn-bp-ev-card">
                      <div className="syn-bp-ev-card-top">
                        <div className="syn-bp-ev-meta">
                          <span className={`syn-bp-grade syn-bp-grade--${ev.evidenceGrade}`}>{EVIDENCE_GRADE_LABEL[ev.evidenceGrade]}</span>
                          <span className="syn-bp-design">{STUDY_DESIGN_LABEL[ev.studyDesign]}</span>
                        </div>
                        <button type="button" className="syn-bp-text-link syn-bp-text-link--card" onClick={() => openLiteratureEntry(ev.id)}>
                          定位该文献条目
                        </button>
                      </div>
                      <div className="syn-bp-ev-title">{ev.title}</div>
                      <p className="syn-bp-ev-thesis">{ev.thesis}</p>
                    </li>
                  ))}
                </ul>
                {displayLiteratureRows.length > evidencePreviewRows.length ? (
                  <p className="syn-bp-empty-ev">其余证据用于补充亚组适用性与风险平衡，请在文献证据模块查看完整条目。</p>
                ) : null}
              </>
            )}
          </section>

          <section className="syn-bp-panel syn-bp-panel--rwd" aria-labelledby="syn-in-h">
            <div className="syn-bp-panel-head">
              <span className="syn-bp-panel-label">院内</span>
              <h3 id="syn-in-h" className="syn-bp-panel-h">
                本院路径归纳
              </h3>
            </div>
            <div className="syn-bp-panel-source-row">
              <span className="syn-bp-panel-source">{track.rwdDataSource}</span>
              <button type="button" className="syn-bp-text-link" onClick={openRwdLibrary}>
                进入电子病历模块
              </button>
            </div>
            <p className="syn-bp-prose">诊疗归纳：{institutionClinicalSummary}</p>
            {casePreviewRows.length > 0 ? (
              <>
                <div className="syn-bp-panel-head syn-bp-panel-head--sub">
                  <span className="syn-bp-panel-label">病例概览</span>
                  <h4 className="syn-bp-panel-h syn-bp-panel-h--sub">本病种相关病例（节选）</h4>
                </div>
                <ul className="syn-bp-case-list">
                  {casePreviewRows.map((p) => (
                    <li key={p.id} className="syn-bp-case-card">
                      <div className="syn-bp-case-top">
                        <span className="syn-bp-case-adm">住院号 {p.admissionId}</span>
                        <span className={`syn-bp-grade syn-bp-grade--${p.riskLevel === 'medium' ? 'moderate' : p.riskLevel ?? 'low'}`}>
                          {p.riskLevel === 'high' ? '高危' : p.riskLevel === 'medium' ? '中危' : '低危'}
                        </span>
                      </div>
                      <div className="syn-bp-case-diag">{p.diagnosis}</div>
                      <p className="syn-bp-case-meta">{[p.dept ?? '未知科室', p.visitTime ?? '未知就诊时间'].join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="syn-bp-empty-ev">当前病种暂无可用病例样本，请进入电子病历模块查看全量病例。</p>
            )}
            <p className="syn-bp-inst">{stage.institutionalNote}</p>
          </section>
        </main>
      </div>
    </div>
  );
}
