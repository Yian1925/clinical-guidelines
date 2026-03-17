interface DeepConsultProps {
  active: boolean;
  onToggle: () => void;
}

export default function DeepConsult({ active, onToggle }: DeepConsultProps) {
  return (
    <button
      type="button"
      className={`deep-pill ${active ? 'active' : ''}`}
      onClick={onToggle}
    >
      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v3l2 2" />
      </svg>
      深度咨询
    </button>
  );
}
