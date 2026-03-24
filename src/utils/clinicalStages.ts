import type { PatientTimelineV4, TimelineEventV4 } from '../hooks/usePatientTimeline';

export type ClinicalStageId = 1 | 2 | 3 | 4 | 5;

export const CLINICAL_STAGE_DEFS: { id: ClinicalStageId; title: string; hint: string }[] = [
  { id: 1, title: '发现问题', hint: '主诉/症状、初步诊断' },
  { id: 2, title: '检查评估', hint: '影像检查、实验室检验' },
  { id: 3, title: '明确诊断', hint: '病理/分型、关键结论' },
  { id: 4, title: '治疗启动', hint: '治疗方案、给药/医嘱' },
  { id: 5, title: '出院/随访', hint: '出院记录、后续复查' },
];

/** 按日期时间展平病程，供阶段视图与排序使用 */
export function flattenTimelineEvents(
  timeline: PatientTimelineV4['timeline']
): Array<TimelineEventV4 & { date: string }> {
  const out: Array<TimelineEventV4 & { date: string }> = [];
  timeline.forEach((day) => {
    day.events.forEach((ev) => {
      out.push({ date: day.date, ...ev });
    });
  });
  out.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.time || '').localeCompare(b.time || '');
  });
  return out;
}

/**
 * 将单条事件映射到诊疗阶段（规则演示，非临床 NLP）。
 * 与 PPT「路径重建」五段对齐，便于和原始 EMR 分类对照。
 */
export function assignClinicalStage(ev: TimelineEventV4 & { date: string }): ClinicalStageId {
  const st = String(ev.sub_type || '');
  if (ev.category === '医嘱') return 4;
  if (ev.category === '检查' || ev.category === '化验') return 2;
  if (ev.category === '病历文书') {
    if (/出院/.test(st)) return 5;
    if (/入院|首程|现病史|病程/.test(st)) return 1;
    return 2;
  }
  if (ev.category === '诊断') {
    if (/出院/.test(st)) return 5;
    if (/入院|待排|性质待排|疑似/.test(st)) return 1;
    if (/病理|细胞|分型|免疫组化|基因/.test(st)) return 3;
    return 3;
  }
  return 2;
}

export function groupEventsByClinicalStage(
  events: Array<TimelineEventV4 & { date: string }>
): { id: ClinicalStageId; title: string; hint: string; events: Array<TimelineEventV4 & { date: string }> }[] {
  const buckets: Record<ClinicalStageId, Array<TimelineEventV4 & { date: string }>> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };
  for (const ev of events) {
    buckets[assignClinicalStage(ev)].push(ev);
  }
  return CLINICAL_STAGE_DEFS.map((def) => ({
    ...def,
    events: buckets[def.id],
  }));
}
