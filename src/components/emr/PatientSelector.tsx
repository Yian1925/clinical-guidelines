import { useState, useEffect } from 'react';
import type { Patient } from '../../types';

interface PatientSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
}

export default function PatientSelector({ open, onClose, onSelect }: PatientSelectorProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    import('../../data/emr/patients.json')
      .then((m) => setPatients(m.default as Patient[]))
      .catch(() => setPatients([]));
  }, []);

  const filtered = patients.filter(
    (p) =>
      !search.trim() ||
      p.name.includes(search) ||
      p.admissionId.includes(search) ||
      p.diagnosis.includes(search)
  );

  const handleSelect = (p: Patient) => {
    onSelect(p);
    onClose();
  };

  const tagClass = (tag: string) => {
    if (tag === '高危' || tag === '中高危') return 'etag r';
    if (tag === '低危') return 'etag green';
    return 'etag';
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal patient-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>选择患者 · 电子病历系统</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            placeholder="搜索患者姓名、住院号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-secondary)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {filtered.map((p) => (
            <div
              key={p.id}
              className="emr-patient"
              onClick={() => handleSelect(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(p)}
            >
              <div className="emr-info">
                <p>{p.name}</p>
                <span>{p.gender} · {p.age}岁 · 住院号 {p.admissionId}</span>
                <div className="emr-tags">
                  {p.tags.map((t) => (
                    <span key={t} className={tagClass(t)}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
