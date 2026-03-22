import { useState, useMemo } from 'react';
import type { Patient } from '../../types';
import { PATIENTS } from '../../data/emr/patients';
import { useModalDialog } from '../../hooks/useModalDialog';
import { roleButtonActivate } from '../../utils/keyboard';

interface PatientSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
}

export default function PatientSelector({ open, onClose, onSelect }: PatientSelectorProps) {
  const [search, setSearch] = useState('');
  const modalRef = useModalDialog(open, onClose);

  const filtered = useMemo(
    () =>
      PATIENTS.filter(
        (p) =>
          !search.trim() ||
          p.name.includes(search) ||
          p.admissionId.includes(search) ||
          p.diagnosis.includes(search)
      ),
    [search]
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
      <div
        ref={modalRef}
        className="modal patient-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-patient-selector-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="modal-patient-selector-title">选择患者 · 载入病历</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              id="patient-selector-search"
              type="text"
              className="toc-search-input"
              placeholder="搜索姓名、住院号或诊断…"
              aria-label="搜索患者姓名、住院号或诊断"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => setSearch((s) => s.trim())}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '0.5px solid var(--color-border-secondary)',
                background: 'var(--color-background-secondary)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              搜索
            </button>
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="emr-patient"
              onClick={() => handleSelect(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => roleButtonActivate(e, () => handleSelect(p))}
            >
              <div className="emr-info">
                <p>{p.name}</p>
                <span>{p.gender} · {p.age}岁 · ID {p.admissionId}</span>
                <div className="emr-tags">
                  {p.tags.map((t) => (
                    <span key={t} className={tagClass(t)}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="emr-diagnosis" title={p.diagnosis}>
                {p.diagnosis}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
