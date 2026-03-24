import { useState, useCallback } from 'react';
import type { ChatMessage as ChatMessageType, ChatSourceLink } from '../types';

type StructuredParams = {
  disease: string;
  stage: string;
  questionType: string;
  outputTemplate: string;
  question: string;
};

function extractAdmissionId(text: string): string | null {
  const m = text.match(/\bY\d{6,}\b/i);
  return m ? m[0].toUpperCase() : null;
}

function inferDiseaseKind(diseaseText: string): 'cervical' | 'breast' | 'lung' | 'other' {
  const t = diseaseText.toLowerCase();
  if (t.includes('宫颈') || t.includes('cervical')) return 'cervical';
  if (t.includes('乳腺') || t.includes('breast')) return 'breast';
  if (t.includes('肺') || t.includes('lung') || t.includes('sclc') || t.includes('nsclc')) return 'lung';
  return 'other';
}

function parseStructuredPrompt(q: string): StructuredParams | null {
  const lines = q.split('\n').map((s) => s.trim());
  const disease = lines.find((x) => x.startsWith('病种：'))?.replace('病种：', '').trim();
  const stage = lines.find((x) => x.startsWith('阶段：'))?.replace('阶段：', '').trim();
  const questionType = lines.find((x) => x.startsWith('问题类型：'))?.replace('问题类型：', '').trim();
  const outputTemplate = lines.find((x) => x.startsWith('输出模板：'))?.replace('输出模板：', '').trim();
  const question = lines.find((x) => x.startsWith('当前问题：'))?.replace('当前问题：', '').trim();
  if (!disease || !stage || !questionType || !outputTemplate || !question) return null;
  return { disease, stage, questionType, outputTemplate, question };
}

function getStructuredAnswer(p: StructuredParams): { text: string; sources: ChatSourceLink[]; guidelineTocId?: string } {
  const diseaseKind = inferDiseaseKind(p.disease);
  const isCervical = diseaseKind === 'cervical';
  const isBreast = diseaseKind === 'breast';
  const isLung = diseaseKind === 'lung';
  const admissionId = extractAdmissionId(p.question);

  const tocId = isCervical ? 'tumor-cervical' : isBreast ? 'tumor-breast' : undefined;

  let pathwayPrimary = '按分期和风险分层进入指南主路径。';
  let pathwayAlternative = '当毒性、并发症或患者目标变化时，进入降阶或替代路径。';
  let evidenceLines = [
    '证据 1：高等级证据支持标准路径优先，先保证适应证匹配再讨论升级。',
    '证据 2：低确定性证据不应单独驱动换线，需与指南和病程动态共同判断。',
  ];
  let monitoringPlan = [
    '治疗前：完成分层必需检查与禁忌筛查。',
    '治疗中：按周期监测疗效与关键毒性，达到阈值即触发路径切换。',
    '治疗后：按阶段随访，记录复发风险信号与不良事件恢复情况。',
  ];
  let mdtQuestions = [
    '当前病例是否满足升级路径适应证？',
    '若失败或不耐受，降阶路径的触发阈值是什么？',
    '本地执行链路（检查-治疗-随访）最薄弱环节在哪里？',
  ];

  if (isCervical && p.stage.includes('局部晚期')) {
    pathwayPrimary = '首选“根治性放疗 + 同期含铂化疗”，在适应证满足且禁忌可控时进入“放化疗 + 免疫”升级分支。';
    pathwayAlternative = '若出现免疫禁忌或无法耐受，可回到放化疗主路径并加强局部控制与支持治疗。';
    evidenceLines = [
      '证据 1（高）：KEYNOTE 类随机研究显示联合免疫可改善关键结局，获益与人群筛选强相关。',
      '证据 2（中）：真实世界中获益受放疗执行质量、并发症负担与依从性影响，需动态复评。',
      '证据边界：活动性自身免疫病、未控感染或器官储备不足时，不宜机械升级。',
    ];
    monitoringPlan = [
      '治疗前：完成免疫禁忌筛查、感染评估、放疗靶区与近距离治疗可执行性核对。',
      '治疗中：每周期监测血象、肾功能、免疫相关不良事件；达到 2 级以上持续毒性即复盘治疗线。',
      '治疗后：按 6-12 周复评影像与症状，明确持续治疗、降阶或转后线方案。',
    ];
    mdtQuestions = [
      '本例是否真正满足免疫升级标准，还是仅满足“可尝试”条件？',
      '若发生 irAE，暂停/停药阈值和替代路径是否已预先定义？',
      '局部控制失败风险来自分期、靶区覆盖还是治疗连续性？',
    ];
  }
  if (isBreast && p.stage.includes('HER2-low')) {
    pathwayPrimary = '内分泌经治进展后，优先比较“ADC 升级”与“标准化疗序贯”两条路径，前置条件是 HER2-low 判读可重复。';
    pathwayAlternative = '若 HER2-low 复核不一致或肺毒性风险高，转入标准化疗/内分泌后线并保留再评估窗口。';
    evidenceLines = [
      '证据 1（高）：DESTINY-Breast04 提示 HER2-low 人群在关键终点上可获益。',
      '证据 2（中）：获益与病理判读稳定性、既往治疗线数、毒性可管理性相关。',
      '证据边界：IHC/ISH 灰区、既往肺部基础病或无法密切监测时，外推需谨慎。',
    ];
    monitoringPlan = [
      '治疗前：完成 HER2-low 复核、基线胸部评估与风险分层。',
      '治疗中：每周期评估呼吸症状与影像必要性，出现疑似 ILD 立即暂停并分级处置。',
      '治疗后：按疗效-毒性平衡决定维持、换线或回退到标准序贯方案。',
    ];
    mdtQuestions = [
      '本例 HER2-low 判读是否稳定可复现？',
      '当前获益预期是否足以覆盖 ILD 等关键风险？',
      '若早期停药，备选路径是否已经前置规划？',
    ];
  }
  if (isBreast && p.stage.includes('保乳术后')) {
    pathwayPrimary = '标准路径是保乳术后全乳放疗；仅在严格低危条件下，进入“省略放疗”分支评估。';
    pathwayAlternative = '若低危条件不完整或依从性不可保证，回归放疗标准路径，不建议“边缘省略”。';
    evidenceLines = [
      '证据 1（中）：老年 HR+ 低危人群可讨论省略放疗，但局部复发风险通常高于放疗组。',
      '证据 2（中）：总生存差异不显著不等于所有亚组都可省略，需要严格人群匹配。',
      '证据边界：年轻患者、三阴性、切缘高风险或依从性不足者不宜外推省略策略。',
    ];
    monitoringPlan = [
      '治疗前：核对低危定义、切缘状态、内分泌可行性与患者偏好。',
      '治疗中：若省略放疗，需提高随访密度并强化影像与症状追踪。',
      '治疗后：出现复发风险信号时应快速回到强化局部控制路径。',
    ];
    mdtQuestions = [
      '该患者是否同时满足“生物学低危 + 治疗依从性高”双条件？',
      '省略放疗后，随访频次和触发回切标准是否被明确记录？',
      '患者是否充分理解“绝对风险差异”而非只看相对风险？',
    ];
  }
  if (isLung) {
    pathwayPrimary = '先完成病理分型与分期（局限期/广泛期），局限期以含铂化疗联合胸部放疗为主，达缓解后评估是否进入 PCI 分支。';
    pathwayAlternative = '若神经认知风险高、体能差或合并症负担重，可不做 PCI，改为强化脑MRI随访并前置症状预警。';
    evidenceLines = [
      '证据 1（中）：局限期 SCLC 在初治缓解后，PCI 可降低脑转移累积风险。',
      '证据 2（中）：PCI 的神经认知与生活质量代价需要与生存获益个体化平衡。',
      '证据边界：高龄、基础认知障碍或预期依从性不足患者，不宜机械套用 PCI。',
    ];
    monitoringPlan = [
      '治疗前：核对病理分型、分期与基础认知状态，记录脑MRI基线。',
      '治疗中：每周期复评体能、骨髓抑制与神经症状，必要时调整剂量强度。',
      '治疗后：若未行PCI，按计划提高脑MRI随访频次并设置紧急复评触发条件。',
    ];
    mdtQuestions = [
      '本例是否满足“PCI 获益大于风险”的核心条件？',
      '若选择不做 PCI，脑转移早筛策略是否可执行且已告知患者？',
      '后续系统治疗与支持治疗的切换阈值是否已明确？',
    ];
  }

  let templateBlock = `
    <h3>${p.outputTemplate}结论草案</h3>
    <ul>
      <li><strong>首选方案：</strong>${pathwayPrimary}</li>
      <li><strong>备选方案：</strong>${pathwayAlternative}</li>
      <li><strong>触发切换条件：</strong>达到毒性阈值、疗效不足或适应证不再满足时，立即转入备选路径。</li>
    </ul>
  `;

  if (p.outputTemplate.includes('MDT')) {
    templateBlock = `
      <h3>MDT讨论版结论草案</h3>
      <ul>
        <li><strong>本次需拍板：</strong>主路径是否升级、何时复评、何时切换。</li>
        <li><strong>会前必备材料：</strong>分期依据、关键病理、近期疗效与毒性曲线。</li>
        <li><strong>讨论建议：</strong>先确认适应证，再确认风险承受边界，最后确定降阶预案。</li>
        <li><strong>输出格式：</strong>“首选 + 备选 + 触发阈值 + 下次复评时间点”。</li>
      </ul>
    `;
  } else if (p.outputTemplate.includes('复盘')) {
    templateBlock = `
      <h3>病例复盘版结论草案</h3>
      <ul>
        <li><strong>路径执行偏差：</strong>标注“应执行节点”与“实际执行节点”差异。</li>
        <li><strong>关键失分点：</strong>分层判读、切换时机、毒性处置是否延迟。</li>
        <li><strong>可复用改进：</strong>把本例转化为下一例的触发规则与检查清单。</li>
        <li><strong>结论句式：</strong>“若再次遇到同类病例，应在X节点前完成Y动作”。</li>
      </ul>
    `;
  } else if (p.outputTemplate.includes('科研')) {
    templateBlock = `
      <h3>科研分析版结论草案</h3>
      <ul>
        <li><strong>研究假设：</strong>路径升级是否在特定亚组带来可重复获益。</li>
        <li><strong>核心变量：</strong>分层指标、治疗线数、关键毒性、随访结局。</li>
        <li><strong>可行终点：</strong>PFS/局部复发率/治疗中断率/严重不良事件发生率。</li>
        <li><strong>数据策略：</strong>先做病例内路径一致性清洗，再进行亚组对照分析。</li>
      </ul>
    `;
  }

  const evidenceId =
    isCervical && p.stage.includes('局部晚期')
      ? 'ev-002'
      : isCervical && p.stage.includes('特殊人群')
        ? 'ev-005'
        : isBreast && p.stage.includes('HER2-low')
          ? 'ev-003'
          : isBreast && p.stage.includes('保乳术后')
            ? 'ev-004'
          : isLung
            ? 'ev-008'
            : isCervical
              ? 'ev-002'
              : isBreast
                ? 'ev-003'
                : undefined;

  const hasGuideline = Boolean(tocId);
  const hasEvidence = Boolean(evidenceId && (isCervical || isBreast || isLung));
  const hasCase = Boolean(admissionId || isCervical || isBreast || isLung);
  const citeInline = [
    hasGuideline ? '[指南]' : null,
    hasEvidence ? '[文献]' : null,
    hasCase ? '[病例]' : null,
  ].filter(Boolean).join('');

  const html = `
    <h3>临床问题重述</h3>
    <p><strong>${p.disease}</strong> · <strong>${p.stage}</strong> · <strong>${p.questionType}</strong></p>
    <p>当前问题：${p.question}${citeInline ? ` <sup>${citeInline}</sup>` : ''}</p>
    <h3>候选路径对照</h3>
    <ul>
      <li><strong>主路径：</strong>${pathwayPrimary}${hasGuideline ? ' <sup>[指南]</sup>' : ''}</li>
      <li><strong>备选路径：</strong>${pathwayAlternative}${hasGuideline || hasCase ? ` <sup>${[hasGuideline ? '[指南]' : '', hasCase ? '[病例]' : ''].join('')}</sup>` : ''}</li>
    </ul>
    <h3>证据归纳</h3>
    <ul>
      ${evidenceLines.map((line) => `<li>${line}${hasEvidence ? ' <sup>[文献]</sup>' : ''}</li>`).join('')}
    </ul>
    <h3>院内执行要点</h3>
    <ul>
      ${monitoringPlan
        .map((line) => `<li>${line}${hasCase || hasGuideline ? ` <sup>${[hasCase ? '[病例]' : '', hasGuideline ? '[指南]' : ''].join('')}</sup>` : ''}</li>`)
        .join('')}
    </ul>
    <h3>需在会中明确的问题</h3>
    <ul>
      ${mdtQuestions.map((line) => `<li>${line}</li>`).join('')}
    </ul>
    ${templateBlock}
  `;

  const sources: ChatSourceLink[] = [];
  if (hasGuideline && tocId) {
    sources.push({ label: '指南路径依据', targetPage: 'guidelines', guidelineTocId: tocId });
  }
  if (hasEvidence && evidenceId) {
    sources.push({ label: '文献证据条目', targetPage: 'literature', evidenceId });
  }
  if (admissionId) {
    sources.push({ label: `病例时间线（${admissionId}）`, targetPage: 'patients', admissionId });
  } else if (isCervical || isBreast || isLung) {
    sources.push({
      label: '真实世界病例库',
      targetPage: 'patients',
      diagnosisKeywords: isCervical ? ['宫颈癌'] : isBreast ? ['乳腺癌'] : ['肺癌', '小细胞肺癌', 'SCLC'],
    });
  }

  return {
    text: html,
    sources,
    guidelineTocId: tocId,
  };
}

function getAnswer(q: string): { text: string; sources: ChatSourceLink[]; guidelineTocId?: string } {
  const structured = parseStructuredPrompt(q);
  if (structured) return getStructuredAnswer(structured);

  const raw = q.trim();
  if (!raw) {
    return {
      text: `
        <h3>临床问题重述</h3>
        <p>未检测到有效问题，请补充一个具体临床场景后重试。</p>
      `,
      sources: [],
    };
  }

  const lower = raw.toLowerCase();
  const disease =
    lower.includes('宫颈') || lower.includes('cervical')
      ? '宫颈癌'
      : lower.includes('乳腺') || lower.includes('breast')
        ? '浸润性乳腺癌'
        : lower.includes('肺') || lower.includes('lung') || lower.includes('sclc') || lower.includes('nsclc')
          ? '肺癌'
        : '未指定病种';
  const stage = lower.includes('晚期') || lower.includes('转移')
    ? disease === '宫颈癌'
      ? '局部晚期 · 根治性放化疗'
      : disease.includes('乳腺')
        ? '晚期 · HR+ / HER2-low 全身治疗'
        : disease.includes('肺')
          ? '晚期 · 全身治疗与并发症监测'
        : '阶段未指定'
    : disease === '宫颈癌'
      ? '初评、诊断与分期'
      : disease.includes('乳腺')
        ? '初评、病理与分子分型'
        : disease.includes('肺')
          ? '初评、诊断与分期'
        : '阶段未指定';
  const inferred: StructuredParams = {
    disease,
    stage,
    questionType: '治疗选择',
    outputTemplate: 'MDT讨论版',
    question: raw,
  };
  return getStructuredAnswer(inferred);

}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback((content: string) => {
    const structured = parseStructuredPrompt(content);
    const userText = structured
      ? `${structured.question}\n\n（${structured.disease} · ${structured.stage}）`
      : content;
    const userMsg: ChatMessageType = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => {
      const ans = structured ? getStructuredAnswer(structured) : getAnswer(content);
      const aiMsg: ChatMessageType = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: ans.text,
        sources: ans.sources,
        ...(ans.guidelineTocId && { guidelineTocId: ans.guidelineTocId }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1200);
  }, []);

  const askQuestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  const resetChat = useCallback(() => {
    setMessages([]);
  }, []);

  const addAIMessage = useCallback((text: string, sources?: string[]) => {
    const aiMsg: ChatMessageType = {
      id: `a-${Date.now()}`,
      role: 'ai',
      text,
      sources: (sources ?? []).map((s) => ({ label: s, targetPage: 'literature' })),
    };
    setMessages((prev) => [...prev, aiMsg]);
  }, []);

  return { messages, loading, sendMessage, resetChat, askQuestion, addAIMessage };
}
