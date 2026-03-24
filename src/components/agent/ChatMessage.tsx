import type { ChatSourceLink, MessageRole } from '../../types';
import SourceCard from './SourceCard';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface ChatMessageProps {
  role: MessageRole;
  text: string;
  sources?: ChatSourceLink[];
  onSourceClick?: (source: ChatSourceLink) => void;
}

const UserAvatarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 44C42 34.0589 33.9411 26 24 26C14.0589 26 6 34.0589 6 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ChatMessage({ role, text, sources = [], onSourceClick }: ChatMessageProps) {
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
              <SourceCard key={`${s.targetPage}-${s.label}`} label={s.label} onClick={() => onSourceClick?.(s)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
