/**
 * 文献证据库 — 循证标注（演示用）
 * - 证据等级：采用 GRADE 四档（用于治疗/干预类结论的确定性；演示为简化标注）。
 * - 研究设计：常见观察性分类，便于检索与分层。
 */

import type { EvidenceGradeCode, StudyDesignCode } from '../types';

export const EVIDENCE_GRADE_LABEL: Record<EvidenceGradeCode, string> = {
  high: '高（GRADE）',
  moderate: '中（GRADE）',
  low: '低（GRADE）',
  very_low: '极低（GRADE）',
};

export const STUDY_DESIGN_LABEL: Record<StudyDesignCode, string> = {
  rct: '随机对照试验（RCT）',
  systematic_review_meta: '系统综述 / Meta 分析',
  cohort: '队列研究',
  case_control: '病例对照研究',
  case_series: '病例系列',
  narrative_review: '叙述性综述',
  pooled_analysis: '个体病例数据汇总 / 合并分析',
};
