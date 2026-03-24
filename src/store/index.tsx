import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PageId } from '../types';
import type { Patient } from '../types';

/** 病例库进入单患者路径重建时，顶栏替换为返回 + 患者标识 */
export type PatientsJourneyTopBar = { patientName: string; admissionId: string; onBack: () => void };

/** 从综合展示进入文献库：限定列表范围并选中条目，消费后清空 */
export type LiteratureDeepLinkPayload = {
  restrictToEvidenceIds: string[];
  focusEvidenceId: string | null;
};

/** 从综合展示进入病例库：按病种关键词过滤列表，消费后清空 */
export type PatientsListDeepLinkPayload = {
  diagnosisKeywords: string[];
};

interface AppState {
  page: PageId;
  patient: Patient | null;
  deepConsult: boolean;
  /** 跳转到诊疗路径时希望选中的 TOC id，如 tumor-cervical，消费后清空 */
  guidelineTocId: string | null;
  patientsJourneyTopBar: PatientsJourneyTopBar | null;
  /** 文献证据库：打开后选中并定位该条目 id，消费后清空（单条跳转，不限定列表） */
  literatureFocusEvidenceId: string | null;
  /** 综合展示「进入文献模块」：限定为阶段关联 id 并聚焦，消费后清空 */
  literatureDeepLink: LiteratureDeepLinkPayload | null;
  /** 真实世界病例库：进入后自动打开该住院号的路径重建，消费后清空 */
  patientsOpenJourneyAdmissionId: string | null;
  /** 综合展示「进入病例模块」：按病种过滤病例列表，消费后清空 */
  patientsListDeepLink: PatientsListDeepLinkPayload | null;
  /** 从综合展示跳转到目标模块时写入，用于显示“返回综合展示”按钮 */
  synthesisEntryTarget: PageId | null;
  /** 从 Agent 问答跳转到目标模块时写入，用于显示“返回Agent问答”按钮 */
  chatEntryTarget: PageId | null;
  setPage: (p: PageId) => void;
  setPatient: (p: Patient | null) => void;
  setDeepConsult: (v: boolean) => void;
  setGuidelineTocId: (id: string | null) => void;
  setPatientsJourneyTopBar: (v: PatientsJourneyTopBar | null) => void;
  setLiteratureFocusEvidenceId: (id: string | null) => void;
  setLiteratureDeepLink: (v: LiteratureDeepLinkPayload | null) => void;
  setPatientsOpenJourneyAdmissionId: (id: string | null) => void;
  setPatientsListDeepLink: (v: PatientsListDeepLinkPayload | null) => void;
  setSynthesisEntryTarget: (p: PageId | null) => void;
  setChatEntryTarget: (p: PageId | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('chat');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [deepConsult, setDeepConsult] = useState(false);
  const [guidelineTocId, setGuidelineTocId] = useState<string | null>(null);
  const [patientsJourneyTopBar, setPatientsJourneyTopBar] = useState<PatientsJourneyTopBar | null>(null);
  const [literatureFocusEvidenceId, setLiteratureFocusEvidenceId] = useState<string | null>(null);
  const [literatureDeepLink, setLiteratureDeepLink] = useState<LiteratureDeepLinkPayload | null>(null);
  const [patientsOpenJourneyAdmissionId, setPatientsOpenJourneyAdmissionId] = useState<string | null>(null);
  const [patientsListDeepLink, setPatientsListDeepLink] = useState<PatientsListDeepLinkPayload | null>(null);
  const [synthesisEntryTarget, setSynthesisEntryTarget] = useState<PageId | null>(null);
  const [chatEntryTarget, setChatEntryTarget] = useState<PageId | null>(null);

  const value: AppState = {
    page,
    patient,
    deepConsult,
    guidelineTocId,
    patientsJourneyTopBar,
    literatureFocusEvidenceId,
    literatureDeepLink,
    patientsOpenJourneyAdmissionId,
    patientsListDeepLink,
    synthesisEntryTarget,
    chatEntryTarget,
    setPage,
    setPatient,
    setDeepConsult,
    setGuidelineTocId,
    setPatientsJourneyTopBar,
    setLiteratureFocusEvidenceId,
    setLiteratureDeepLink,
    setPatientsOpenJourneyAdmissionId,
    setPatientsListDeepLink,
    setSynthesisEntryTarget,
    setChatEntryTarget,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
