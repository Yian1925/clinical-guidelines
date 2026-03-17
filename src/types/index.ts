// Agent / Chat
export type MessageRole = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  sources?: string[];
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
  /** 对应旅程图数据中的 patient_id，有则可加载该患者旅程图 */
  timelineId?: string;
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

// Page / UI
export type PageId = 'chat' | 'guidelines' | 'patients';
