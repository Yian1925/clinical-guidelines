import { useState } from 'react';
import type { Patient } from './types';
import { AppStoreProvider, useAppStore } from './store';
import { useAgent } from './hooks/useAgent';
import { useGuideline } from './hooks/useGuideline';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ChatInterface from './components/agent/ChatInterface';
import GuidelineViewer from './components/guidelines/GuidelineViewer';
import PatientSelector from './components/emr/PatientSelector';
import PatientsPage from './components/emr/PatientsPage';
import './styles/platform.css';

function AppContent() {
  const { page, setPage, patient, setPatient } = useAppStore();
  const { messages, loading, sendMessage, askQuestion, addAIMessage } = useAgent();
  const { doc } = useGuideline();
  const [emrModalOpen, setEmrModalOpen] = useState(false);

  const handleSelectPatient = (p: Patient) => {
    if (!p) return;
    setPatient(p);
    setEmrModalOpen(false);
    const desc = `${p.gender}·${p.age}岁·${p.diagnosis}`;
    addAIMessage(`已载入患者：<strong>${p.name}</strong>（${desc}）。后续问答将结合该患者病历数据进行分析。`);
  };

  const handleAskAboutNode = (nodeTitle: string) => {
    setPage('chat');
    askQuestion(`请详细解释「${nodeTitle}」的临床意义和操作规范`);
  };

  const pageConfig = page === 'chat'
    ? { title: 'Agent 医学问答', badge: undefined }
    : page === 'guidelines'
      ? { title: '指南数据库', badge: undefined }
      : { title: '病例库', badge: undefined };

  return (
    <div className="shell" style={{ position: 'relative' }}>
      <Sidebar page={page} onPageChange={setPage} />
      <div className="main">
        <TopBar
          title={pageConfig.title}
          badge={pageConfig.badge}
          onNewChat={undefined}
        />
        <div className={`page ${page === 'chat' ? 'active' : ''}`} id="page-chat">
          <ChatInterface
            messages={messages}
            loading={loading}
            onSendMessage={sendMessage}
            onAskQuestion={askQuestion}
            onOpenPatientSelector={() => setEmrModalOpen(true)}
            patientLabel={patient ? patient.name : '选择患者'}
          />
        </div>
        <div className={`page ${page === 'guidelines' ? 'active' : ''}`} id="page-guidelines">
          <GuidelineViewer
            doc={doc}
            onAskAboutNode={handleAskAboutNode}
            onNavigateToChat={() => setPage('chat')}
          />
        </div>
        <div className={`page ${page === 'patients' ? 'active' : ''}`} id="page-patients">
          <PatientsPage />
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
