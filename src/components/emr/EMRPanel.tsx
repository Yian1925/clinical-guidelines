import type { Patient } from '../../types';

interface EMRPanelProps {
  patient: Patient | null;
  onClose?: () => void;
}

export default function EMRPanel({ patient, onClose }: EMRPanelProps) {
  if (!patient) return null;

  return (
    <div className="emr-panel" style={{ padding: 16, background: 'var(--color-background-secondary)', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>当前患者</strong>
        {onClose && (
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        )}
      </div>
      <div className="emr-av" style={{ marginBottom: 8 }}>{patient.name.slice(0, 1)}</div>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{patient.name}</p>
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
        {patient.gender} · {patient.age}岁 · ID {patient.admissionId}
      </span>
      <div className="emr-tags" style={{ marginTop: 4 }}>
        {patient.tags.map((t) => (
          <span key={t} className="etag">{t}</span>
        ))}
      </div>
    </div>
  );
}
