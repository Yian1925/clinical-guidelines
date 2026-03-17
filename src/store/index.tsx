import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PageId } from '../types';
import type { Patient } from '../types';

interface AppState {
  page: PageId;
  patient: Patient | null;
  deepConsult: boolean;
  /** 跳转到诊疗路径时希望选中的 TOC id，如 tumor-cervical，消费后清空 */
  guidelineTocId: string | null;
  setPage: (p: PageId) => void;
  setPatient: (p: Patient | null) => void;
  setDeepConsult: (v: boolean) => void;
  setGuidelineTocId: (id: string | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('chat');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [deepConsult, setDeepConsult] = useState(false);
  const [guidelineTocId, setGuidelineTocId] = useState<string | null>(null);

  const value: AppState = {
    page,
    patient,
    deepConsult,
    guidelineTocId,
    setPage,
    setPatient,
    setDeepConsult,
    setGuidelineTocId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
