import { useState, useEffect } from 'react';
import type { Patient } from '../../types';
import PatientJourneyMap from './PatientJourneyMap';
import { usePatientTimeline } from '../../hooks/usePatientTimeline';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  const timelineId = selectedPatient?.timelineId ?? selectedPatient?.id ?? null;
  const { data: timelineData, loading } = usePatientTimeline(timelineId);

  const tagClass = (tag: string) => {
    if (tag === '高危' || tag === '中高危') return 'etag r';
    if (tag === '低危') return 'etag green';
    return 'etag';
  };

  return (
    <div className="page patients-page" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div
          className="gl-toc"
          style={{
            width: 280,
            // borderRight: '0.5px solid var(--color-border-tertiary)',
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <input
            type="text"
            placeholder="搜索患者姓名、ID、诊断..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              margin: '8px 14px',
              padding: '8px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-secondary)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0 14px' }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`emr-patient ${selectedPatient?.id === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPatient(p)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedPatient(p)}
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
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedPatient ? (
            <>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                当前查看：<strong style={{ color: 'var(--color-text-primary)' }}>{selectedPatient.name}</strong>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <PatientJourneyMap data={timelineData} loading={loading} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <div className="journey-empty">
                请从左侧选择或搜索患者，点击即可查看该患者的旅程图。
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="page-footnote">
        患者旅程数据来源于病例数据库，经结构化处理后生成，用于展示患者诊疗时间线。
      </div>
    </div>
  );
}
