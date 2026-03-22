import type { MessageRole } from '../../types';
import SourceCard from './SourceCard';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface ChatMessageProps {
  role: MessageRole;
  text: string;
  sources?: string[];
  /** 点击引用时跳转到诊疗路径的 TOC id，如 tumor-cervical */
  guidelineTocId?: string;
  /** 点击引用来源时调用，可传入要跳转的 guidelineTocId */
  onSourceClick?: (tocId?: string) => void;
}

const UserAvatarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 44C42 34.0589 33.9411 26 24 26C14.0589 26 6 34.0589 6 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ChatMessage({ role, text, sources = [], guidelineTocId, onSourceClick }: ChatMessageProps) {
  return (
    <div className={`msg-row ${role}`}>
      <div className={`avatar ${role}`}>
        {role === 'ai' ? 'AI' : <UserAvatarIcon />}
      </div>
      <div className={`bubble ${role}`}>
        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
        {sources && sources.length > 0 && (
          <div className="source-row">
            {sources.map((s) => (
              <SourceCard key={s} label={s} onClick={() => onSourceClick?.(guidelineTocId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
