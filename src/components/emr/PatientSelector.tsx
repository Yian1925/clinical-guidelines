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
  const [mode, setMode] = useState<'import' | 'library'>('import');
  const [search, setSearch] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Patient | null>(null);
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

  const buildPatientFromImportedJson = (raw: unknown): Patient | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const admissionId = String(obj.admissionId ?? obj.patient_id ?? obj.visit_id ?? '').trim();
    if (!admissionId) return null;
    const name = String(obj.name ?? obj.patientName ?? '未命名患者').trim();
    const diagnosis = String(obj.diagnosis ?? obj.admission_diagnosis ?? obj.discharge_diagnosis ?? '未提供诊断').trim();
    const gender = String(obj.gender ?? obj.sex ?? '未知').trim();
    const ageNum = Number(obj.age ?? 0);
    const age = Number.isFinite(ageNum) && ageNum > 0 ? ageNum : 0;
    const visitTime = String(obj.visitTime ?? obj.admission_date ?? '').trim();
    return {
      id: `import-${admissionId}`,
      name,
      gender,
      age,
      admissionId,
      diagnosis,
      tags: ['导入病例'],
      riskLevel: 'medium',
      visitTime: visitTime || undefined,
      dept: String(obj.dept ?? obj.department ?? '').trim() || undefined,
      hospital: String(obj.hospital ?? obj.hospitalName ?? '').trim() || undefined,
      doctor: String(obj.doctor ?? '').trim() || undefined,
      hasTimeline: false,
    };
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    setImportError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const patient = buildPatientFromImportedJson(json);
      if (!patient) {
        setImportPreview(null);
        setImportError('未识别到患者关键字段（至少需要 admissionId / patient_id / visit_id）。');
        return;
      }
      setImportPreview(patient);
    } catch {
      setImportPreview(null);
      setImportError('文件解析失败，请上传符合格式的 JSON。');
    }
  };

  const handleDownloadTemplate = () => {
    const template = {
      admissionId: 'HOSPITAL-2026-0001',
      name: '张某',
      gender: '女',
      age: 52,
      diagnosis: '浸润性乳腺癌（HR+/HER2-low）',
      dept: '乳腺外科',
      hospital: '某三甲医院',
      admission_date: '2026-03-01',
      note: 'mock阶段模板，字段可按院内系统实际映射',
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <h3 id="modal-patient-selector-title">导入患者数据</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="patient-import-tabs" role="tablist" aria-label="导入方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'import'}
              className={`patient-import-tab ${mode === 'import' ? 'active' : ''}`}
              onClick={() => setMode('import')}
            >
              导入医院数据
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'library'}
              className={`patient-import-tab ${mode === 'library' ? 'active' : ''}`}
              onClick={() => setMode('library')}
            >
              从演示库选择
            </button>
          </div>

          {mode === 'import' ? (
            <div className="patient-import-pane">
              <label className="patient-import-dropzone" htmlFor="patient-import-file">
                <input
                  id="patient-import-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
                <span className="patient-import-dropzone-title">上传医院导出 JSON</span>
                <span className="patient-import-dropzone-sub">支持字段：admissionId / patient_id / visit_id、name、diagnosis</span>
              </label>
              <div className="patient-import-actions patient-import-actions--template">
                <button type="button" className="agent-outline-btn" onClick={handleDownloadTemplate}>
                  下载导入模板
                </button>
              </div>
              {importError ? <p className="patient-import-error">{importError}</p> : null}
              {importPreview ? (
                <>
                  <div className="emr-patient active">
                    <div className="emr-info">
                      <p>{importPreview.name}</p>
                      <span>{importPreview.gender} · {importPreview.age ? `${importPreview.age}岁` : '年龄未提供'} · ID {importPreview.admissionId}</span>
                      <div className="emr-tags">
                        <span className="etag">导入病例</span>
                      </div>
                    </div>
                    <div className="emr-diagnosis" title={importPreview.diagnosis}>
                      {importPreview.diagnosis}
                    </div>
                  </div>
                  <div className="patient-import-actions">
                    <button type="button" className="toc-search-btn" onClick={() => handleSelect(importPreview)}>
                      使用该患者
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div className="toc-search-row">
                <input
                  id="patient-selector-search"
                  type="text"
                  className="toc-search-input"
                  placeholder="搜索姓名、住院号或诊断…"
                  aria-label="搜索患者姓名、住院号或诊断"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" className="toc-search-btn" onClick={() => setSearch((s) => s.trim())}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
