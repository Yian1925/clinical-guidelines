import { useState, useCallback } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';

const ANSWERS: Record<string, { text: string; sources: string[]; guidelineTocId?: string }> = {
  dlbcl: {
    text: '根据院内诊疗路径及NCCN 2026指南，DLBCL的一线标准治疗方案为 <strong>R-CHOP（利妥昔单抗+环磷酰胺+多柔比星+长春新碱+泼尼松）</strong>，每21天为一个周期，通常6个周期。对于IPI评分3-5分的高危患者，可考虑加强方案（R-CHOEP或剂量密集R-CHOP）。',
    sources: ['DLBCL诊疗路径 v2.3', 'NCCN B-cell 2026', '院内高危DLBCL队列研究'],
  },
  mcl: {
    text: '套细胞淋巴瘤（MCL）诊断需满足：<br>① 组织病理：弥漫性、结节性或套区型生长模式<br>② 免疫表型：CD20+、CD5+、cyclin D1+（或SOX11+），CD23-<br>③ 分子检测：t(11;14)(q13;q32) CCND1/IGH重排<br><br>本院病理科建议同步完成 TP53 测序，影响预后分层。',
    sources: ['套细胞淋巴瘤路径 v2.1', 'MANT_a 免疫组化方案', '院内病理科 SOP v2.3'],
  },
  fl: {
    text: '滤泡性淋巴瘤（FL）采用 Ann Arbor 分期系统，结合 FLIPI 评分：<br><br><strong>Stage I-II（局限期）</strong>：约20%患者，可考虑局部放疗±免疫化疗<br><strong>Stage III-IV（晚期）</strong>：约80%患者，低肿瘤负荷可观察等待，高肿瘤负荷启动治疗<br><br>分期检查必须包括：PET-CT全身扫描、骨髓活检。',
    sources: ['FL诊疗路径 v2.2', 'Ann Arbor分期标准', 'FLIPI评分系统'],
  },
  rchop: {
    text: 'R-CHOP方案标准剂量（每21天一周期）：<br>• 利妥昔单抗（R）：375 mg/m² IV，d1<br>• 环磷酰胺（C）：750 mg/m² IV，d1<br>• 多柔比星（H）：50 mg/m² IV，d1<br>• 长春新碱（O）：1.4 mg/m²（最大2mg）IV，d1<br>• 泼尼松（P）：100 mg/d PO，d1-5<br><br>标准疗程6周期，高危患者评估加至8周期。',
    sources: ['R-CHOP标准方案', '院内化疗规程 v3.1', 'NCCB-cell 2026 T-cell.2'],
  },
  cervical: {
    text: '宫颈癌（Cervical Cancer）一线治疗方案<br><br>宫颈癌的一线治疗方案需根据 FIGO 分期 进行分层决策，不同分期的治疗原则存在显著差异<a href="https://www.noah.bio/tool/clinical-guidelines/60c26597-8903-4ffc-83ed-3940746997d8" target="_blank" rel="noopener noreferrer" class="bubble-citation-link">[1]</a>。<br><br><strong>早期病变（FIGO IA1–IB1/IIA1）</strong> 以手术为主要手段。对于 FIGO IA1 期且无淋巴血管间隙浸润（LVSI）的患者，ESMO 与 NCCN 指南均推荐保育手术行锥切，或不需保留生育功能时行简单子宫切除术<a href="https://guidelines.nccn.org/guidelines/Cervical2_2026" target="_blank" rel="noopener noreferrer" class="bubble-citation-link">[2]</a>。对于 IA1 伴 LVSI、IA2 及 IB1 期患者，推荐选项包括根治性或简单子宫切除 + 盆腔淋巴结清扫（PLND）± 腹主动脉旁淋巴结清扫，以及前哨淋巴结（SLN）活检；有生育需求的 IB1 患者（肿瘤 ≤2 cm）可选择根治性宫颈切除术（trachelectomy）+ PLND。<br><br><strong>局部晚期病变（FIGO IB2/II/III 期）</strong> 的标准治疗为同步铂类化疗 + 放疗（CRT）。顺铂为基础的同步放化疗联合近距离放疗是局部晚期宫颈癌的标准治疗方案。在此基础上，免疫治疗正在重塑这一格局。III 期 KEYNOTE-A18 研究（ENGOT-cx11/GOG-3047）在高风险局部晚期宫颈癌患者中，帕博利珠单抗联合同步放化疗后序贯帕博利珠单抗维持治疗，36 个月总生存率达 82.6%，对比单纯放化疗的 74.8%，死亡风险降低 33%（HR 0.67；95% CI 0.50–0.90；P = 0.0040）。基于此，FDA 已于 2024 年 1 月 12 日批准帕博利珠单抗联合 CRT 用于 FIGO 2014 III–IVA 期宫颈癌的一线治疗。<br><br><strong>转移性/复发性病变（FIGO IVB 期）</strong> 的一线标准治疗为含铂化疗联合抗血管生成治疗与免疫检查点抑制剂。KEYNOTE-826 研究确立了帕博利珠单抗联合紫杉醇/顺铂或卡铂（± 贝伐珠单抗）的方案地位，对于 PD-L1 表达阳性（CPS ≥1）患者，帕博利珠单抗组中位 OS 未达到，而安慰剂组为 16.3 个月。<br><br>局部晚期 IVA 期 不可切除者行化放疗，经筛选的孤立盆腔病变者可行盆腔廓清术（pelvic exenteration）。<br><br>综上，宫颈癌的一线治疗已进入免疫治疗整合时代，帕博利珠单抗联合方案在局部晚期及转移性宫颈癌中均获 I 级证据支持，应成为符合适应证患者的首选策略。<br><br><strong>参考来源：</strong><br>1. ESMO Cervical Cancer Clinical Practice Guidelines 2017（Marth et al., Ann Oncol）<br>2. KEYNOTE-A18 OS 分析（Lorusso et al., Lancet 2024）<br>3. KEYNOTE-826（FDA 批准，2021）<br>4. NCCN Guidelines Cervical Cancer v.1.2024。',
    sources: ['ESMO Cervical Cancer Clinical Practice Guidelines 2017', 'KEYNOTE-A18 OS 分析', 'KEYNOTE-826', 'NCCN Guidelines Cervical Cancer v.1.2024'],
    guidelineTocId: 'tumor-cervical',
  },
  default: {
    text: '根据院内诊疗路径数据库检索，该问题涉及多个临床维度。建议结合患者具体指标（IPI评分、肿瘤负荷、基因突变状态）综合判断。',
    sources: ['院内诊疗路径数据库', 'NCCN 2026指南'],
  },
};

function getAnswer(q: string): { text: string; sources: string[]; guidelineTocId?: string } {
  const lower = q.toLowerCase();
  if (lower.includes('宫颈癌') || lower.includes('cervical cancer')) return ANSWERS.cervical;
  if (lower.includes('dlbcl') || lower.includes('弥漫')) return ANSWERS.dlbcl;
  if (lower.includes('套细胞') || lower.includes('mcl') || lower.includes('诊断标准')) return ANSWERS.mcl;
  if (lower.includes('滤泡') || lower.includes('fl') || lower.includes('分期')) return ANSWERS.fl;
  if (lower.includes('r-chop') || lower.includes('rchop') || lower.includes('剂量')) return ANSWERS.rchop;
  return ANSWERS.default;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback((content: string) => {
    const userMsg: ChatMessageType = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => {
      const ans = getAnswer(content);
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
      sources,
    };
    setMessages((prev) => [...prev, aiMsg]);
  }, []);

  return { messages, loading, sendMessage, resetChat, askQuestion, addAIMessage };
}
