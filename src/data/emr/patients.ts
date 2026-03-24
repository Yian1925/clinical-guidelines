import type { Patient } from '../../types';
import patientsJson from './patients.json';

/**
 * 患者主数据（唯一数据源）：Agent「选择患者」与「真实世界病例库」列表共用。
 * 增删改请只编辑 patients.json。
 */
export const PATIENTS: Patient[] = patientsJson as Patient[];
