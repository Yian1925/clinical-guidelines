interface SourceCardProps {
  label: string;
  onClick?: () => void;
}

export default function SourceCard({ label, onClick }: SourceCardProps) {
  return (
    <button
      type="button"
      className="source-tag"
      onClick={onClick}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 7h6M7 10h6" />
      </svg>
      {label}
    </button>
  );
}
