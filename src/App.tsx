import { useState, useEffect, lazy, Suspense } from 'react';
import type { Patient } from './types';
import { AppStoreProvider, useAppStore } from './store';
import { useAgent } from './hooks/useAgent';
import { useGuideline } from './hooks/useGuideline';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ChatInterface from './components/agent/ChatInterface';
import PatientSelector from './components/emr/PatientSelector';
import PatientsPage from './components/emr/PatientsPage';
import LiteraturePage from './components/literature/LiteraturePage';
import SynthesisPage from './components/synthesis/SynthesisPage';
import './styles/platform.css';

const GuidelineViewer = lazy(() => import('./components/guidelines/GuidelineViewer'));

function AppContent() {
  const { page, setPage, patient, setPatient, patientsJourneyTopBar } = useAppStore();
  const { messages, loading, sendMessage, askQuestion, resetChat } = useAgent();
  const { doc } = useGuideline();
  const [emrModalOpen, setEmrModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSelectPatient = (p: Patient) => {
    if (!p) return;
    setPatient(p);
    setEmrModalOpen(false);
    const desc = `${p.gender}·${p.age}岁·${p.diagnosis}`;
    const toastText = `已载入患者：${p.name}（${desc}）。后续问答将结合该患者真实世界摘要。`;
    setToast(toastText);
  };

  const handleAskAboutNode = (nodeTitle: string) => {
    setPage('chat');
    askQuestion(`请详细解释「${nodeTitle}」的临床意义和操作规范`);
  };

  const pageConfig =
    page === 'chat'
      ? { title: 'Agent 问答', badge: undefined }
      : page === 'guidelines'
        ? { title: '诊疗路径', badge: undefined }
        : page === 'patients'
          ? { title: '真实世界病例库', badge: undefined }
          : page === 'literature'
            ? { title: '文献证据库', badge: undefined }
            : page === 'synthesis'
              ? { title: '综合展示', badge: undefined }
              : { title: 'MedGuide AI', badge: undefined };

  return (
    <div className="shell" style={{ position: 'relative' }}>
      <Sidebar page={page} onPageChange={setPage} />
      <div className="main main--tinted">
        {toast && (
          <div
            role="alert"
            className="patient-toast"
            style={{
              position: 'absolute',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#000',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 16,
              fontSize: 13,
              zIndex: 10000,
              maxWidth: '90%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {toast}
          </div>
        )}
        <TopBar
          title={pageConfig.title}
          badge={pageConfig.badge}
          onNewChat={undefined}
          patientsJourney={page === 'patients' ? patientsJourneyTopBar : null}
        />
        <div className={`page ${page === 'chat' ? 'active' : ''}`} id="page-chat">
          <ChatInterface
            messages={messages}
            loading={loading}
            onSendMessage={sendMessage}
            onResetChat={resetChat}
            onOpenPatientSelector={() => setEmrModalOpen(true)}
            patientLabel={patient ? `住院号 ${patient.admissionId}` : '导入患者'}
          />
        </div>
        <div className={`page ${page === 'guidelines' ? 'active' : ''}`} id="page-guidelines">
          <Suspense fallback={<div className="gl-main">正在加载诊疗路径…</div>}>
            <GuidelineViewer
              doc={doc}
              onAskAboutNode={handleAskAboutNode}
              onNavigateToChat={() => setPage('chat')}
            />
          </Suspense>
        </div>
        <div className={`page ${page === 'patients' ? 'active' : ''}`} id="page-patients">
          <PatientsPage />
        </div>
        <div className={`page ${page === 'literature' ? 'active' : ''}`} id="page-literature">
          <LiteraturePage />
        </div>
        <div className={`page ${page === 'synthesis' ? 'active' : ''}`} id="page-synthesis">
          <SynthesisPage />
        </div>
        <PatientSelector
          open={emrModalOpen}
          onClose={() => setEmrModalOpen(false)}
          onSelect={handleSelectPatient}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
