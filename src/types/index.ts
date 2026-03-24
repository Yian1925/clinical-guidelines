// Agent / Chat
export type MessageRole = 'user' | 'ai';

export interface ChatSourceLink {
  label: string;
  targetPage: 'guidelines' | 'literature' | 'patients';
  guidelineTocId?: string;
  evidenceId?: string;
  admissionId?: string;
  diagnosisKeywords?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  sources?: ChatSourceLink[];
  /** 点击引用来源时跳转到诊疗路径的 TOC id，如 tumor-cervical */
  guidelineTocId?: string;
}

export interface SourceRef {
  id: string;
  label: string;
  onClick?: () => void;
}

// EMR / Patient
export interface Patient {
  id: string;
  name: string;
  gender: string;
  age: number;
  admissionId: string;
  diagnosis: string;
  tags: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  /** 对应真实世界时间线数据中的 patient_id，有则可加载路径重建视图 */
  timelineId?: string;
  /** 列表表格：就诊时间 */
  visitTime?: string;
  /** 列表表格：科室 */
  dept?: string;
  /** 列表表格：医疗机构 */
  hospital?: string;
  /** 列表表格：主治医生 */
  doctor?: string;
  /** 是否有可展示的旅程时间线（patient_timeline.json 有对应 patient_id） */
  hasTimeline?: boolean;
}

// Patient timeline / journey map
export interface PatientSummary {
  visit_id: number;
  gender: string;
  age: number;
  admission_date: string;
  discharge_date: string;
  chief_complaint?: string;
  final_diagnosis: string;
  treat_result: string;
  treat_days: number;
}

export interface TimelineEventItem {
  date: string;
  label: string;
  detail: string;
  type: string;
  note?: string;
  abnormal?: boolean;
  highlight?: boolean;
}

export interface JourneyTrack {
  id: string;
  label: string;
  color: { dot: string; bg: string; border: string; text: string };
  items: TimelineEventItem[];
}

// Guidelines
export type FlowNodeType = 'diag' | 'choice' | 'action' | 'warning';

export interface GuidelineNodeData {
  id: string;
  tag: string;
  title: string;
  body?: string;
  type: FlowNodeType;
  options?: { label: string; selected?: boolean }[];
  ref?: string;
}

export interface TocItem {
  id: string;
  label: string;
  labelZh?: string;
  children?: TocItem[];
}

export interface GuidelineDoc {
  id: string;
  title: string;
  meta: string;
  toc: TocItem[];
  nodes: GuidelineNodeData[];
  footnotes?: string;
}

// Literature evidence (文献证据路径归纳 — demo)
export type LiteratureEvidenceCategory =
  | 'special_pop'
  | 'scheme_compare'
  | 'boundary'
  | 'outcome';

/** GRADE：证据确定性（多用于干预效果；演示为简化标注） */
export type EvidenceGradeCode = 'high' | 'moderate' | 'low' | 'very_low';

/** 研究设计大类（循证检索常用） */
export type StudyDesignCode =
  | 'rct'
  | 'systematic_review_meta'
  | 'cohort'
  | 'case_control'
  | 'case_series'
  | 'narrative_review'
  | 'pooled_analysis';

/**
 * 与指南路径的语义对齐（中间表示层 / 综合展示用，本页不做界面跳转）
 * tocId 与诊疗路径目录 id 一致；stage/node 为可映射到指南图节点的占位说明。
 */
export interface GuidelinePathAlignment {
  tocId: string;
  stageHint?: string;
  nodeHint?: string;
}

export interface LiteratureEvidenceItem {
  id: string;
  /** 条目标题（展示用） */
  title: string;
  /** 一句话证据要点（归纳结论，非仅论文题录） */
  thesis: string;
  category: LiteratureEvidenceCategory;
  /** GRADE 证据等级（演示） */
  evidenceGrade: EvidenceGradeCode;
  /** 研究设计 */
  studyDesign: StudyDesignCode;
  /** 研究对象：什么患者 / 阶段 / 特征 */
  researchObject: string;
  /** 处理策略：检查、治疗或管理动作 */
  strategy: string;
  /** 适用条件：何时适用/不适用/前提 */
  applicableConditions: string;
  /** 关键结果：疗效、安全性、转归或策略差异 */
  keyResults: string;
  citation: string;
  journal?: string;
  year?: number;
  doi?: string;
  keywords: string[];
  /** 与指南路径的可对齐元数据（供多源匹配与综合展示层，非跳转） */
  guidelineAlignment?: GuidelinePathAlignment | null;
}

// 综合展示层 — 按疾病 × 诊疗阶段（BMJ Best Practice 式信息架构，演示）
export interface SynthesisClinicalStage {
  id: string;
  order: number;
  title: string;
  /** BMJ 式「Key points」置顶条（2–4 条） */
  keyPoints: string[];
  /** 本阶段临床概览 */
  clinicalSummary: string;
  /** 指南要点（条列） */
  guidelinePoints: string[];
  /** 本院路径归纳（演示） */
  institutionalNote: string;
  /** 本阶段挂载的文献证据 id */
  literatureIds: string[];
  /** 可跳转路径重建的演示住院号（电子病历） */
  rwdDemoAdmissionIds?: string[];
  /** 跳转样例与当前病种不一致等说明 */
  rwdJumpNote?: string;
}

export interface SynthesisDiseaseTrack {
  id: string;
  name: string;
  subtitle?: string;
  guidelineTocId: string;
  pathwaySourceLabel: string;
  /** 指南摘要的数据来源说明（展示用） */
  guidelineDataSource: string;
  /** 文献块数据来源说明 */
  literatureDataSource: string;
  /** 院内路径块数据来源说明 */
  rwdDataSource: string;
  /** 进入病例库时用于病种过滤的关键词（匹配 diagnosis/tags） */
  rwdDiagnosisKeywords?: string[];
  /** 页面级更新日期 / 版本文案 */
  lastUpdatedLabel: string;
  stages: SynthesisClinicalStage[];
  /** 病种级带入 Agent 的概览追问 */
  agentOverviewQuestion?: string;
}

// Page / UI
export type PageId = 'chat' | 'guidelines' | 'patients' | 'literature' | 'synthesis';
