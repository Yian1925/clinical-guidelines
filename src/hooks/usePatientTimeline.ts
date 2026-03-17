import { useState, useEffect } from 'react';
import type { PatientSummary, JourneyTrack } from '../types';

export interface PatientTimelineData {
  patient_id: string;
  patient_summary: PatientSummary;
  tracks: JourneyTrack[];
  dateLabels: string[];
  dateRange: [string, string];
}

interface RawTimelineEvent {
  date?: string;
  start_datetime?: string;
  execute_date?: string;
  type?: string;
  note_type?: string;
  description?: string;
  content_preview?: string;
  impression?: string;
  category?: string;
  sub_category?: string;
  order_text?: string;
  order_class?: string;
  test_name?: string;
  treat_result?: string | null;
  is_abnormal?: boolean | null;
  items?: Array< { abnormal?: string }>;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const m1 = s.match(/^(\d+)\/(\d+)\/(\d+)\s*(\d+):(\d+)/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}T${m1[4]}:${m1[5]}`;
  const m2 = s.match(/^(\d{4})\/(\d+)\/(\d+)\s+(\d+):(\d+)/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}T${m2[4]}:${m2[5]}`;
  const m3 = s.match(/^(\d+)\/(\d+)\/(\d{4})/);
  if (m3) return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  return s;
}

function getXPct(dateStr: string | undefined, start: number, end: number): number | null {
  if (!dateStr) return null;
  const norm = parseDate(dateStr);
  const d = new Date(norm ?? '');
  if (isNaN(d.getTime())) return null;
  const frac = (d.getTime() - start) / (end - start);
  return Math.min(Math.max(frac, 0), 0.999);
}

const TRACK_COLORS: Record<string, JourneyTrack['color']> = {
  diagnosis: { dot: '#534AB7', bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489' },
  emr: { dot: '#0F6E56', bg: '#E1F5EE', border: '#5DCAA5', text: '#085041' },
  exam: { dot: '#185FA5', bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C' },
  lab: { dot: '#854F0B', bg: '#FAEEDA', border: '#EF9F27', text: '#633806' },
  orders: { dot: '#993C1D', bg: '#FAECE7', border: '#F0997B', text: '#4A1B0C' },
};

function buildTracksFromRaw(raw: {
  timeline_events?: {
    diagnoses?: RawTimelineEvent[];
    emr_records?: RawTimelineEvent[];
    examinations?: RawTimelineEvent[];
    lab_results?: Array<RawTimelineEvent & { items?: Array<{ abnormal?: string }> }>;
    orders?: RawTimelineEvent[];
  };
}): JourneyTrack[] {
  const tracks: JourneyTrack[] = [];
  const ev = raw.timeline_events ?? {};

  if (ev.diagnoses?.length) {
    tracks.push({
      id: 'diagnosis',
      label: '诊断',
      color: TRACK_COLORS.diagnosis,
      items: ev.diagnoses.map((d) => ({
        date: d.date ?? '',
        label: d.type ?? '诊断',
        detail: d.description ?? '',
        type: d.type ?? '诊断',
        note: d.treat_result ? `治疗结果：${d.treat_result}` : undefined,
      })),
    });
  }

  if (ev.emr_records?.length) {
    tracks.push({
      id: 'emr',
      label: '病历',
      color: TRACK_COLORS.emr,
      items: ev.emr_records.map((r) => ({
        date: r.date ?? '',
        label: r.note_type === 'none' ? '病程记录' : (r.note_type ?? '病历'),
        detail: (r.content_preview ?? '').slice(0, 120) + (r.content_preview && r.content_preview.length > 120 ? '…' : ''),
        type: '病历',
      })),
    });
  }

  if (ev.examinations?.length) {
    tracks.push({
      id: 'exam',
      label: '检查',
      color: TRACK_COLORS.exam,
      items: ev.examinations.map((e) => ({
        date: e.date ?? '',
        label: e.category + (e.sub_category ? `（${e.sub_category}）` : ''),
        detail: e.impression ?? e.description ?? '',
        type: e.category ?? '检查',
        abnormal: e.is_abnormal === true,
      })),
    });
  }

  if (ev.lab_results?.length) {
    type LabItem = { item_name?: string; abnormal?: string };
    tracks.push({
      id: 'lab',
      label: '检验',
      color: TRACK_COLORS.lab,
      items: ev.lab_results.map((l) => {
        const items = (l.items ?? []) as LabItem[];
        const hasAbnormal = items.some((i) => i.abnormal && i.abnormal !== '正常');
        const detail = items
          .filter((i) => i.abnormal && i.abnormal !== '正常')
          .map((i) => `${i.item_name ?? ''}${i.abnormal ?? ''}`)
          .join('；') || items.map((i) => `${i.item_name ?? ''}: ${i.abnormal ?? '正常'}`).slice(0, 3).join('；');
        return {
          date: l.execute_date ?? (l as RawTimelineEvent).date ?? '',
          label: l.test_name ?? '检验',
          detail: detail || (l.test_name ?? '检验'),
          type: l.test_name ?? '检验',
          abnormal: hasAbnormal,
        };
      }),
    });
  }

  if (ev.orders?.length) {
    tracks.push({
      id: 'orders',
      label: '治疗',
      color: TRACK_COLORS.orders,
      items: ev.orders.slice(0, 20).map((o) => ({
        date: o.start_datetime ?? o.date ?? '',
        label: o.order_text ?? o.order_class ?? '医嘱',
        detail: o.order_class ? `${o.order_class}${o.order_text ? '：' + o.order_text : ''}` : (o.order_text ?? ''),
        type: o.order_class ?? '治疗',
        highlight: (o.order_text ?? '').includes('化疗'),
      })),
    });
  }

  return tracks;
}

function getDateLabels(admission: string, discharge: string): string[] {
  const labels: string[] = [];
  const start = new Date(admission);
  const end = new Date(discharge);
  const d = new Date(start);
  while (d <= end) {
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    d.setDate(d.getDate() + 1);
  }
  return labels;
}

export function usePatientTimeline(patientId: string | null) {
  const [data, setData] = useState<PatientTimelineData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      return;
    }
    setLoading(true);
    import('../data/guidelines/patient_timeline.json')
      .then((m) => {
        const raw = m.default as {
          patient_id: string;
          patient_summary: PatientSummary;
          timeline_events?: Parameters<typeof buildTracksFromRaw>[0]['timeline_events'];
        };
        if (raw.patient_id !== patientId) {
          setData(null);
          return;
        }
        const summary = raw.patient_summary;
        const tracks = buildTracksFromRaw(raw);
        const dateLabels = getDateLabels(summary.admission_date, summary.discharge_date);
        setData({
          patient_id: raw.patient_id,
          patient_summary: summary,
          tracks,
          dateLabels,
          dateRange: [summary.admission_date, summary.discharge_date],
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  return { data, loading };
}

export function getXPctForRange(dateStr: string | undefined, dateRange: [string, string]): number | null {
  if (!dateStr) return null;
  const start = +new Date(dateRange[0]);
  const end = +new Date(dateRange[1]) + 86400000;
  return getXPct(dateStr, start, end);
}
