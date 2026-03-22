import { useState, useEffect } from 'react';

/** New patient_timeline.json (v4) shape */
export interface TimelineEventV4 {
  time: string;
  category: string;
  sub_type: string;
  content: Record<string, unknown> & {
    items?: Array<{
      name?: string;
      result?: string;
      unit?: string;
      abnormal?: string;
      reference?: string;
    }>;
    abnormal_count?: number;
    abnormal_items?: string[];
    diagnosis?: string;
    treat_result?: string | null;
    with_surgery?: boolean | null;
    summary?: string;
    impression?: string;
    recommendation?: string | null;
    order_text?: string;
    class?: string;
    dosage?: string;
    route?: string;
    stop_datetime?: string;
    subject?: string;
    exam_class?: string;
    exam_sub_class?: string;
  };
}

export interface PatientTimelineV4 {
  patient: {
    patient_id: string;
    name: string;
    sex: string;
    age: number;
    date_of_birth?: string;
    visit_id?: number;
    admission_date: string;
    discharge_date: string;
    admission_diagnosis: string;
    discharge_diagnosis: string;
    total_days: number;
    treatment_result: string;
  };
  summary?: {
    total_events?: number;
    total_days?: number;
    event_types?: Record<string, number>;
  };
  timeline: Array<{
    date: string;
    event_count?: number;
    events: TimelineEventV4[];
  }>;
}

export function usePatientTimeline(patientId: string | null) {
  const [data, setData] = useState<PatientTimelineV4 | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      return;
    }
    setLoading(true);
    import('../data/guidelines/patient_timeline.json')
      .then((m) => {
        const raw = m.default as PatientTimelineV4;
        if (!raw?.patient || raw.patient.patient_id !== patientId) {
          setData(null);
          return;
        }
        setData(raw);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  return { data, loading };
}

/** @deprecated Legacy horizontal timeline — kept for any external use */
export function getXPctForRange(_dateStr: string | undefined, _dateRange: [string, string]): number | null {
  return null;
}
