import { useState, useRef, useEffect, useId } from 'react';
import ChatMessage from './ChatMessage';
import UploadFileModal from './UploadFileModal';
import UploadFolderModal from './UploadFolderModal';
import type { ChatMessage as ChatMessageType } from '../../types';
import { useAppStore } from '../../store';

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  loading: boolean;
  onSendMessage: (content: string) => void;
  onAskQuestion: (q: string) => void;
  onOpenPatientSelector: () => void;
  patientLabel: string;
}

const WELCOME_CHIPS = [
  '宫颈癌（Cervical cancer）的一线治疗方案是什么？',
  '套细胞淋巴瘤的诊断标准和病理特征？',
  '滤泡性淋巴瘤如何分期？Ann Arbor分期标准',
  'R-CHOP方案的具体剂量和周期？',
  '淋巴瘤患者的骨髓活检指征？',
];

export default function ChatInterface({
  messages,
  loading,
  onSendMessage,
  onAskQuestion,
  onOpenPatientSelector,
  patientLabel,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const areaRef = useRef<HTMLDivElement>(null);
  const welcomeInputRef = useRef<HTMLTextAreaElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const { setPage, setGuidelineTocId } = useAppStore();
  const uploadMaskIdA = useId();
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [uploadFolderOpen, setUploadFolderOpen] = useState(false);

  useEffect(() => {
    if (areaRef.current) areaRef.current.scrollTop = areaRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setUploadMenuOpen(false);
      }
    };
    if (uploadMenuOpen) {
      document.addEventListener('mousedown', closeMenu);
      return () => document.removeEventListener('mousedown', closeMenu);
    }
  }, [uploadMenuOpen]);

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    onSendMessage(q);
  };

  const handleChip = (q: string) => {
    setInput(q);
    welcomeInputRef.current?.focus();
  };

  const goToGuidelines = (tocId?: string) => {
    if (tocId) setGuidelineTocId(tocId);
    setPage('guidelines');
  };

  const showWelcome = messages.length === 0 && !loading;

  return (
    <>
      <div className="chat-area" ref={areaRef}>
        {showWelcome && (
          <div className="chat-welcome">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'oklab(0.7109 -0.131805 0.0071752 / 0.999953)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22H8L12 11L17 37L23 20L27 28L34 15L38 29L40 22H44" />
              </svg>
            </div>
            <h2>您好，我是 MedGuide AI</h2>
            <p>基于院内电子病历与标准诊疗路径，为您提供循证临床决策支持</p>
            <div className="chips">
              <div className="chips-row">
                {WELCOME_CHIPS.slice(0, 3).map((q) => (
                  <button key={q} type="button" className="chip" onClick={() => handleChip(q)}>
                    {q.length > 20 ? q.slice(0, 18) + '…' : q}
                  </button>
                ))}
              </div>
              <div className="chips-row">
                {WELCOME_CHIPS.slice(3).map((q) => (
                  <button key={q} type="button" className="chip" onClick={() => handleChip(q)}>
                    {q.length > 20 ? q.slice(0, 18) + '…' : q}
                  </button>
                ))}
              </div>
            </div>
            <div className="chat-input-wrap chat-input-below-chips">
              <div style={{ display: 'flex', gap: 1, marginBottom: 0 }}>
                <button type="button" className="patient-pill" onClick={onOpenPatientSelector}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="8" r="4" />
                    <path d="M3 18c0-4 3-6 7-6s7 2 7 6" />
                  </svg>
                  {patientLabel}
                </button>
              </div>
              <div className="input-box">
                <textarea
                  ref={welcomeInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入医学问题，例如：DLBCL 一线治疗方案..."
                  rows={4}
                />
                <div className="input-actions">
                  <div className="upload-trigger-wrap" ref={uploadMenuRef}>
                    <button
                      type="button"
                      className="ic-btn"
                      title="上传"
                      onClick={() => setUploadMenuOpen((v) => !v)}
                      aria-haspopup="true"
                      aria-expanded={uploadMenuOpen}
                    >
                      <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <mask id={uploadMaskIdA} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48" style={{ maskType: 'alpha' }}>
                          <path d="M48 0H0V48H48V0Z" fill="#333" />
                        </mask>
                        <g mask={`url(#${uploadMaskIdA})`}>
                          <path d="M6 24.0083V42H42V24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M33 15L24 6L15 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M23.9917 32V6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      </svg>
                    </button>
                    {uploadMenuOpen && (
                      <div className="upload-dropdown">
                        <button type="button" className="upload-dropdown-item" onClick={() => { setUploadMenuOpen(false); setUploadFileOpen(true); }}>
                          上传文件
                        </button>
                        <button type="button" className="upload-dropdown-item" onClick={() => { setUploadMenuOpen(false); setUploadFolderOpen(true); }}>
                          上传文件夹
                        </button>
                      </div>
                    )}
                  </div>
                  <button type="button" className="send-btn" onClick={handleSend}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 10L3 4l3 6-3 6z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            text={msg.text}
            sources={msg.sources}
            guidelineTocId={msg.guidelineTocId}
            onSourceClick={goToGuidelines}
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
      {!showWelcome && (
        <div className="chat-input-wrap chat-input-conversation">
          <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
            <button type="button" className="patient-pill" onClick={onOpenPatientSelector}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="8" r="4" />
                <path d="M3 18c0-4 3-6 7-6s7 2 7 6" />
              </svg>
              {patientLabel}
            </button>
          </div>
          <div className="input-box">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入医学问题，例如：DLBCL 一线治疗方案..."
              rows={2}
            />
            <div className="input-actions">
              <button type="button" className="send-btn" onClick={handleSend}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 10L3 4l3 6-3 6z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <UploadFileModal open={uploadFileOpen} onClose={() => setUploadFileOpen(false)} />
      <UploadFolderModal open={uploadFolderOpen} onClose={() => setUploadFolderOpen(false)} />
    </>
  );
}
