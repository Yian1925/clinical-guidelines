import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType, ChatSourceLink } from '../../types';
import { useAppStore } from '../../store';
import PatientJourneyV4 from '../emr/PatientJourneyV4';
import { usePatientTimeline } from '../../hooks/usePatientTimeline';

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  loading: boolean;
  onSendMessage: (content: string) => void;
  onResetChat: () => void;
  onOpenPatientSelector: () => void;
  patientLabel: string;
}

const DEFAULT_QUESTION_TYPE = '治疗选择';
const DEFAULT_OUTPUT_TEMPLATE = 'MDT讨论版';
const QUICK_ASK_EXAMPLES = [
  'HER2-low 晚期乳腺癌在内分泌经治后，何时优先选择 ADC？',
  '局部晚期宫颈癌同步放化疗时，哪些患者可以考虑免疫联合？',
  '保乳术后高龄 HR+ 低危患者，省略放疗的边界条件是什么？',
] as const;

function inferDiseaseAndStageFromPatientDiagnosis(diagnosis: string): { disease: string; stage: string } {
  const lower = diagnosis.toLowerCase();
  if (lower.includes('宫颈')) {
    return { disease: '宫颈癌', stage: '初评、诊断与分期' };
  }
  if (lower.includes('乳腺') || lower.includes('breast')) {
    return { disease: '浸润性乳腺癌', stage: '初评、病理与分子分型' };
  }
  if (lower.includes('肺') || lower.includes('lung')) {
    return { disease: '肺癌', stage: '初评、诊断与分期' };
  }
  // fallback: keep diagnosis truthfully instead of forcing a known demo disease
  return { disease: diagnosis || '未指定病种', stage: '阶段待结合病程判定' };
}

export default function ChatInterface({
  messages,
  loading,
  onSendMessage,
  onResetChat,
  onOpenPatientSelector,
  patientLabel,
}: ChatInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'patient' | 'question'>('question');
  const [patientConcern, setPatientConcern] = useState('');
  const [quickQuestion, setQuickQuestion] = useState('');
  const [showJourneyFullscreen, setShowJourneyFullscreen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  const {
    patient,
    setPage,
    setGuidelineTocId,
    setLiteratureFocusEvidenceId,
    setLiteratureDeepLink,
    setPatientsListDeepLink,
    setPatientsOpenJourneyAdmissionId,
    setSynthesisEntryTarget,
    setChatEntryTarget,
  } = useAppStore();

  const timelineId =
    patient == null
      ? null
      : patient.hasTimeline === false
        ? null
        : patient.timelineId ?? patient.admissionId ?? null;
  const { data: timelineData, loading: timelineLoading } = usePatientTimeline(timelineId);

  useEffect(() => {
    if (areaRef.current) areaRef.current.scrollTop = areaRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!patient) return;
    setActiveTab('patient');
    if (!patientConcern.trim()) {
      setPatientConcern(`请基于住院号 ${patient.admissionId} 的病程，给出本阶段的关键诊疗决策、风险监测点和下一步策略。`);
    }
  }, [patient, patientConcern]);

  const handlePatientRun = () => {
    if (!patient) return;
    const inferred = inferDiseaseAndStageFromPatientDiagnosis(patient.diagnosis);
    const question = patientConcern.trim();
    if (!question) return;
    const composed = [
      `病种：${inferred.disease}`,
      `阶段：${inferred.stage}`,
      `问题类型：${DEFAULT_QUESTION_TYPE}`,
      `输出模板：${DEFAULT_OUTPUT_TEMPLATE}`,
      `当前问题：${question}`,
    ].join('\n');
    onSendMessage(composed);
  };

  const handleQuickAsk = () => {
    const q = quickQuestion.trim();
    if (!q) return;
    setQuickQuestion('');
    onSendMessage(q);
  };

  const goToResource = (source: ChatSourceLink) => {
    // clear synthesis return context when jumping from chat sources
    setSynthesisEntryTarget(null);
    if (source.targetPage === 'guidelines') {
      setChatEntryTarget('guidelines');
      if (source.guidelineTocId) setGuidelineTocId(source.guidelineTocId);
      setPage('guidelines');
      return;
    }
    if (source.targetPage === 'literature') {
      setChatEntryTarget('literature');
      if (source.evidenceId) {
        setLiteratureDeepLink(null);
        setLiteratureFocusEvidenceId(source.evidenceId);
      }
      setPage('literature');
      return;
    }
    setChatEntryTarget('patients');
    if (source.admissionId) {
      setPatientsOpenJourneyAdmissionId(source.admissionId);
    } else {
      setPatientsOpenJourneyAdmissionId(null);
      if (source.diagnosisKeywords && source.diagnosisKeywords.length > 0) {
        setPatientsListDeepLink({ diagnosisKeywords: source.diagnosisKeywords });
      }
    }
    setPage('patients');
  };

  return (
    <>
      <div className="chat-area" ref={areaRef}>
        <div className="agent-workbench">
          <div className="agent-workbench-head">
            <h2 className="agent-workbench-title">Agent 问答工作台</h2>
            <button type="button" className="agent-outline-btn" onClick={onResetChat}>
              新建会话
            </button>
          </div>

          <div className="agent-tab-row" role="tablist" aria-label="Agent 问答模式">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'patient'}
              className={`agent-tab-btn ${activeTab === 'patient' ? 'active' : ''}`}
              onClick={() => setActiveTab('patient')}
            >
              导入患者
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'question'}
              className={`agent-tab-btn ${activeTab === 'question' ? 'active' : ''}`}
              onClick={() => setActiveTab('question')}
            >
              直接提问
            </button>
          </div>

          {activeTab === 'patient' ? (
            <div className="agent-patient-flow">
              <button type="button" className="patient-pill" onClick={onOpenPatientSelector}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="8" r="4" />
                  <path d="M3 18c0-4 3-6 7-6s7 2 7 6" />
                </svg>
                {patientLabel}
              </button>
              {patient ? (
                <>
                  <p className="agent-patient-flow-text">
                    已导入患者：<strong>{patient.name}</strong>（住院号 {patient.admissionId}）· {patient.diagnosis}
                  </p>
                  <p className="agent-section-kicker">系统已自动识别病种与阶段，你只需补充当前要讨论的问题。</p>
                  <div className="agent-journey-inline">
                    {timelineLoading ? (
                      <div className="agent-journey-empty">正在加载患者旅程图…</div>
                    ) : timelineData ? (
                      <PatientJourneyV4 listPatient={patient} data={timelineData} loading={timelineLoading} />
                    ) : (
                      <div className="agent-journey-empty">该患者暂无可展示旅程图。</div>
                    )}
                  </div>
                  <div className="agent-patient-flow-actions">
                    <button
                      type="button"
                      className="agent-outline-btn"
                      onClick={() => setShowJourneyFullscreen(true)}
                      disabled={!timelineData}
                    >
                      全屏查看当前导入病程
                    </button>
                  </div>

                  <div className="agent-question-box">
                    <textarea
                      value={patientConcern}
                      onChange={(e) => setPatientConcern(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handlePatientRun();
                        }
                      }}
                      placeholder="基于该患者，输入当前最需要讨论的问题（Cmd/Ctrl + Enter 发送）"
                      rows={3}
                    />
                    <div className="agent-question-actions">
                      <button type="button" className="agent-run-btn" onClick={handlePatientRun}>
                        基于该患者生成回答
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="agent-quick-ask">
              <div className="agent-section-kicker">直接提问（无需导入患者）</div>
              <div className="agent-presets">
                {QUICK_ASK_EXAMPLES.map((q, idx) => (
                  <button key={q} type="button" className="chip" onClick={() => setQuickQuestion(q)}>
                    {idx + 1}. {q}
                  </button>
                ))}
              </div>
              <div className="agent-quick-ask-row">
                <textarea
                  value={quickQuestion}
                  onChange={(e) => setQuickQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleQuickAsk();
                    }
                  }}
                  placeholder="示例：HER2-low 晚期乳腺癌在内分泌经治后，何时优先选择 ADC？（Cmd/Ctrl + Enter 发送）"
                  rows={2}
                />
                <button type="button" className="agent-run-btn" onClick={handleQuickAsk}>
                  直接提问
                </button>
              </div>
            </div>
          )}
        </div>

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            text={msg.text}
            sources={msg.sources}
            onSourceClick={goToResource}
          />
        ))}
        {loading && (
          <div className="msg-row ai">
            <div className="avatar ai">AI</div>
            <div className="bubble ai">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      {showJourneyFullscreen ? (
        <div className="agent-journey-modal" role="dialog" aria-modal="true" aria-label="当前导入患者完整病程">
          <div className="agent-journey-modal-card">
            <div className="agent-journey-modal-head">
              <div className="agent-journey-modal-title">
                当前导入患者完整病程
                {patient ? ` · ${patient.name}（${patient.admissionId}）` : ''}
              </div>
              <button type="button" className="agent-outline-btn" onClick={() => setShowJourneyFullscreen(false)}>
                关闭
              </button>
            </div>
            <div className="agent-journey-modal-body">
              {patient && timelineData ? (
                <PatientJourneyV4 listPatient={patient} data={timelineData} loading={timelineLoading} />
              ) : (
                <div className="agent-journey-empty">该患者暂无可展示旅程图。</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
