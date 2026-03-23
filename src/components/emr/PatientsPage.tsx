import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Patient } from '../../types';
import { PATIENTS } from '../../data/emr/patients';
import PatientJourneyV4 from './PatientJourneyV4';
import DatePickerField from './DatePickerField';
import { usePatientTimeline } from '../../hooks/usePatientTimeline';
import { useAppStore } from '../../store';
import { roleButtonActivate } from '../../utils/keyboard';
import '../../styles/patients-list.css';

type ViewMode = 'list' | 'journey';

export default function PatientsPage() {
  const { setPatientsJourneyTopBar } = useAppStore();
  const [view, setView] = useState<ViewMode>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [visitType, setVisitType] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dept, setDept] = useState('');
  const [risk, setRisk] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const deptOptions = useMemo(() => {
    const s = new Set<string>();
    PATIENTS.forEach((p) => {
      if (p.dept) s.add(p.dept);
    });
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return PATIENTS.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.admissionId.toLowerCase().includes(q) &&
        !p.diagnosis.toLowerCase().includes(q)
      )
        return false;
      if (dept && p.dept !== dept) return false;
      if (risk && p.riskLevel !== risk) return false;
      if (dateStart && p.visitTime && p.visitTime < dateStart) return false;
      if (dateEnd && p.visitTime && p.visitTime > dateEnd) return false;
      if (visitType) {
        /* 预留：数据中有 visitType 字段时再过滤 */
      }
      return true;
    });
  }, [searchQ, dept, risk, dateStart, dateEnd, visitType]);

  useEffect(() => {
    setPage(1);
  }, [searchQ, dept, risk, dateStart, dateEnd, visitType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedPatients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const pageItems = useMemo(() => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, '...', totalPages] as const;
    if (safePage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages] as const;
    return [1, '...', safePage, '...', totalPages] as const;
  }, [safePage, totalPages]);

  const timelineId =
    selectedPatient == null
      ? null
      : selectedPatient.hasTimeline === false
        ? null
        : selectedPatient.timelineId ?? selectedPatient.admissionId ?? null;

  const { data: timelineData, loading } = usePatientTimeline(timelineId);

  const riskBadgeClass = (level?: Patient['riskLevel']) => {
    if (level === 'high') return 'patients-risk-badge patients-risk-high';
    if (level === 'medium') return 'patients-risk-badge patients-risk-medium';
    return 'patients-risk-badge patients-risk-low';
  };

  const riskLabel = (level?: Patient['riskLevel']) => {
    const m = { high: '高危', medium: '中危', low: '低危' };
    return level ? m[level] : '—';
  };

  const openJourney = (p: Patient) => {
    setSelectedPatient(p);
    setView('journey');
  };

  const backToList = useCallback(() => {
    setView('list');
    setSelectedPatient(null);
  }, []);

  useEffect(() => {
    if (view === 'journey' && selectedPatient) {
      setPatientsJourneyTopBar({
        patientName: selectedPatient.name,
        admissionId: selectedPatient.admissionId,
        onBack: backToList,
      });
      return () => setPatientsJourneyTopBar(null);
    }
    setPatientsJourneyTopBar(null);
  }, [view, selectedPatient, backToList, setPatientsJourneyTopBar]);

  const applySearch = () => {
    setSearchQ((s) => s.trim());
  };

  if (view === 'journey' && selectedPatient) {
    return (
      <div className="patients-page patients-page--journey" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
        <div className="patients-journey-body" style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <PatientJourneyV4 listPatient={selectedPatient} data={timelineData} loading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="patients-page patients-page--list">
      <div className="patients-list-root">
        <div className="patients-list-filters">
          <div className="patients-list-f-group patients-list-f-group--type">
            <span className="patients-list-f-label">就诊类型</span>
            <select className="patients-list-f-select" value={visitType} onChange={(e) => setVisitType(e.target.value)}>
              <option value="">请选择</option>
              <option value="门诊">门诊</option>
              <option value="住院">住院</option>
              <option value="急诊">急诊</option>
            </select>
          </div>
          <div className="patients-list-f-group patients-list-f-group--date">
            <span className="patients-list-f-label">就诊时间</span>
            <DatePickerField
              id="patients-filter-date-start"
              value={dateStart}
              onChange={setDateStart}
              placeholder="开始日期"
              aria-label="筛选开始日期"
            />
            <span className="patients-list-f-sep">至</span>
            <DatePickerField
              id="patients-filter-date-end"
              value={dateEnd}
              onChange={setDateEnd}
              placeholder="结束日期"
              aria-label="筛选结束日期"
            />
          </div>
          <div className="patients-list-f-group patients-list-f-group--dept">
            <span className="patients-list-f-label">科室选择</span>
            <select className="patients-list-f-select" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">请选择</option>
              {deptOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="patients-list-f-group patients-list-f-group--risk">
            <span className="patients-list-f-label">风险等级</span>
            <select className="patients-list-f-select" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="">全部等级</option>
              <option value="high">高危</option>
              <option value="medium">中危</option>
              <option value="low">低危</option>
            </select>
          </div>
          <div className="toc-search-row patients-list-search-row">
            <input
              id="patients-list-search"
              type="search"
              className="toc-search-input"
              placeholder="搜索姓名、编号、诊断…"
              aria-label="搜索姓名、编号或诊断"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
            <button type="button" className="toc-search-btn" onClick={applySearch}>
              搜索
            </button>
          </div>
        </div>

        <div className="patients-list-data-panel">
          <div className="patients-list-table-wrap">
            {filtered.length === 0 ? (
              <div className="patients-list-empty">未找到患者。请调整筛选条件或修改搜索关键词。</div>
            ) : (
              <table className="patients-data-table">
                <thead>
                  <tr>
                    <th>患者编号</th>
                    <th>姓名</th>
                    <th>性别</th>
                    <th>年龄</th>
                    <th>诊断</th>
                    <th>科室</th>
                    <th>就诊时间</th>
                    <th>风险</th>
                    <th>医院</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPatients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => openJourney(p)}
                      onKeyDown={(e) => roleButtonActivate(e, () => openJourney(p))}
                      role="button"
                      tabIndex={0}
                    >
                      <td><span className="patients-td-num">{p.admissionId}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.gender}</td>
                      <td>{p.age}岁</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.diagnosis}>
                        {p.diagnosis}
                      </td>
                      <td>{p.dept ?? '—'}</td>
                      <td>{p.visitTime ?? '—'}</td>
                      <td>
                        <span className={riskBadgeClass(p.riskLevel)}>{riskLabel(p.riskLevel)}</span>
                      </td>
                      <td>{p.hospital ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="patients-list-pagination">
              <div className="patients-list-pagination-meta">Showing {pagedPatients.length} of {filtered.length} patients</div>
              <div className="patients-list-pagination-nav" aria-label="分页导航">
                <button
                  type="button"
                  className="patients-page-btn patients-page-arrow"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="上一页"
                >
                  ‹
                </button>
                {pageItems.map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="patients-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`patients-page-btn ${safePage === item ? 'active' : ''}`}
                      onClick={() => setPage(item)}
                      aria-current={safePage === item ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="patients-page-btn patients-page-arrow"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="下一页"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
