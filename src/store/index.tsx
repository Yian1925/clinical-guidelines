import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PageId } from '../types';
import type { Patient } from '../types';

/** 病例库进入某位患者旅程时，顶栏替换为返回 + 标题（原「病例库」文案位置） */
export type PatientsJourneyTopBar = { patientName: string; onBack: () => void };

interface AppState {
  page: PageId;
  patient: Patient | null;
  deepConsult: boolean;
  /** 跳转到诊疗路径时希望选中的 TOC id，如 tumor-cervical，消费后清空 */
  guidelineTocId: string | null;
  patientsJourneyTopBar: PatientsJourneyTopBar | null;
  setPage: (p: PageId) => void;
  setPatient: (p: Patient | null) => void;
  setDeepConsult: (v: boolean) => void;
  setGuidelineTocId: (id: string | null) => void;
  setPatientsJourneyTopBar: (v: PatientsJourneyTopBar | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('chat');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [deepConsult, setDeepConsult] = useState(false);
  const [guidelineTocId, setGuidelineTocId] = useState<string | null>(null);
  const [patientsJourneyTopBar, setPatientsJourneyTopBar] = useState<PatientsJourneyTopBar | null>(null);

  const value: AppState = {
    page,
    patient,
    deepConsult,
    guidelineTocId,
    patientsJourneyTopBar,
    setPage,
    setPatient,
    setDeepConsult,
    setGuidelineTocId,
    setPatientsJourneyTopBar,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
