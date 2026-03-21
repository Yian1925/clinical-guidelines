import { useState, useCallback, useRef, useMemo, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// NCCN Invasive Breast Cancer — Clinical Pathway Board
//
// KEY NCCN CONCEPTS:
// □ Checkbox (square)  = workup steps done in PARALLEL — multi-checkable
//                        Track completion of clinical actions.
//                        Does NOT drive path expansion.
// ○ Radio (circle)     = mutually exclusive DECISION POINTS — single-select
//                        DRIVES path expansion to show next cards.
//
// ZONES = colored sections grouping cards that belong to the same
//         NCCN algorithm page / clinical scenario
// ═══════════════════════════════════════════════════════════════════════

const T = {
  bg:"#EDF1F8", white:"#FFFFFF", border:"#C4D4EC",
  blue:"#1A4776", blueMid:"#2B65A8", blueLight:"#E8F0FB",
  green:"#0D5C3E", greenLight:"#E6F4EF",
  text:"#182840", textSec:"#4A607C", textMuted:"#7A90A8",
};

const ZONES = {
  toc:         {label:"Table of Contents",              color:"#2A7D5E", bg:"#F0F9F5", border:"#A4D4BC"},
  staging:     {label:"Clinical Stage & Workup",        color:"#1A4776", bg:"#EDF3FB", border:"#ACC6E8"},
  criteria:    {label:"Preop Systemic Tx — Criteria",   color:"#4A2880", bg:"#F2EDF9", border:"#BCA8E0"},
  locoregional:{label:"Locoregional Treatment",         color:"#0D5C3E", bg:"#EDF8F3", border:"#9CCEB4"},
  neoadjuvant: {label:"Neoadjuvant Pathway",            color:"#8C4A10", bg:"#FBF3ED", border:"#D8B48A"},
  surgery:     {label:"Surgical Approach",              color:"#0D5C3E", bg:"#EDF8F3", border:"#9CCEB4"},
  adjuvant:    {label:"Adjuvant Systemic Therapy",      color:"#1A4776", bg:"#EDF3FB", border:"#ACC6E8"},
};

const PH = {
  "TABLE OF CONTENTS":"#2A7D5E", "DIAGNOSIS":"#8C6010",
  "WORKUP":"#1A4776", "CLINICAL STAGE":"#1A4776",
  "TREATMENT DECISION":"#4A2880", "LOCOREGIONAL TREATMENT":"#0D5C3E",
  "SURGERY":"#0D5C3E", "NEOADJUVANT WORKUP":"#8C4A10",
  "SYSTEMIC THERAPY":"#8C4A10", "ADJUVANT THERAPY":"#1A4776",
  "FOLLOW-UP":"#1A7A52", "REFERENCE":"#4A607C",
};

const REF = {
  "BINV-A":"Endocrine therapy protocol details","BINV-C":"Special populations/conditions",
  "BINV-D":"Axillary surgical technique","BINV-E":"Breast reconstruction options",
  "BINV-F":"Post-mastectomy RT/pathology","BINV-G":"BCS eligibility and margin criteria",
  "BINV-H":"Mastectomy with reconstruction","BINV-I":"Radiotherapy principles/exceptions",
  "BINV-K":"Endocrine therapy — Category 2B","BINV-L":"Chemo/targeted therapy regimens",
  "BINV-M":"Preoperative systemic therapy criteria","BINV-M 1":"Preop systemic therapy regimens",
  "BINV-N":"Tumor biology special considerations","BINV-O":"Menopausal status assessment",
  "BINV-Y":"21-gene RT-PCR (Oncotype DX)","BINV-17":"Follow-up/surveillance algorithm",
  "BINV-18":"High-risk additional imaging workup",
  "BINV-2":"→ Page: BCS + adjuvant RT algorithm","BINV-3":"→ Page: Mastectomy + adjuvant RT algorithm",
  "BINV-4":"→ Page: Adjuvant systemic therapy decision","BINV-5":"→ Page: ER+/HER2+ adjuvant therapy",
  "BINV-6":"→ Page: ER+/HER2− postmeno adjuvant","BINV-7":"→ Page: ER+/HER2− premeno pN0 adjuvant",
  "BINV-8":"→ Page: ER+/HER2− premeno pN+ adjuvant","BINV-9":"→ Page: ER−/HER2+ adjuvant",
  "BINV-10":"→ Page: TNBC adjuvant therapy","BINV-11":"→ Page: Favorable histology adjuvant",
  "BINV-12":"→ Page: Neoadjuvant additional workup","BINV-13":"→ Page: Operable pre-neoadjuvant eval",
  "BINV-14":"→ Page: Post-neoadjuvant surgery (operable)","BINV-15":"→ Page: Inoperable neoadjuvant therapy",
  "BINV-16":"→ Page: Post-neoadjuvant adjuvant by subtype","PREG-1":"→ NCCN: Breast Cancer During Pregnancy",
  "Category 1":"Category 1: uniform NCCN consensus, high-level evidence",
};
const DEFAULT_REF_PANEL_HEIGHT = 200;
const MIN_REF_PANEL_HEIGHT = 80;
const BASE_CANVAS_SCALE = 0.7; // Displayed 100% equals previous ~70% visual size

// ── Column definitions ────────────────────────────────────────────────
// cardType: "toc" | "checklist" | "decision" | "info"
const COLS = [
  {
    id:"toc",zone:"toc",cardType:"toc",phase:"TABLE OF CONTENTS",
    title:"Table of Contents",
    description:"NCCN Invasive Breast Cancer guidelines cover localized (M0), recurrent, and metastatic disease scenarios.",
    notes:"This interactive pathway begins with the localized (M0) disease algorithm (pages 12–27 of the NCCN Invasive Breast Cancer guideline). Click 'Invasive Breast Cancer' to enter the algorithm.",
    tocEntries:[{id:"ibc",label:"Invasive Breast Cancer"}],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_dx",zone:"staging",cardType:"decision",phase:"DIAGNOSIS",
    title:"Diagnosis (Clinical)",
    description:"Initial clinical diagnosis establishes the primary disease context and determines which NCCN treatment algorithm applies.",
    notes:"Accurate histological confirmation of invasive breast cancer is required before selecting a pathway. Localized (M0) disease has curative intent. Recurrent and metastatic (M1) disease follow separate algorithms.",
    options:[
      {id:"dx_m0",  label:"Localized breast cancer: Invasive, non-inflammatory, non-metastatic (M0)",refs:[],next:["col_workup","col_stage"]},
      {id:"dx_rec", label:"Local only or regional + local recurrence",refs:[],next:["col_recurrence"]},
      {id:"dx_m1",  label:"Metastatic (M1) invasive breast cancer",refs:[],next:["col_metastatic"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_workup",zone:"staging",cardType:"checklist",phase:"WORKUP",
    title:"Workup",
    description:"Comprehensive initial evaluation required for ALL patients with invasive breast cancer, regardless of clinical stage. Must be completed before initiating any treatment.",
    notes:"Genetic counseling is mandatory for TNBC, hereditary risk, or olaparib candidates. Pregnancy testing required in all premenopausal patients. Additional imaging (BINV-18) only when metastatic signs/symptoms present.",
    checkItems:[
      {id:"w_hpe",  label:"History and physical exam", refs:[]},
      {id:"w_img",  label:"Imaging",sub:["Diagnostic bilateral mammogram","Ultrasound as necessary","Breast MRI (optional) — mammographically occult tumors"], refs:["BINV-b","BINV-c"]},
      {id:"w_path", label:"Pathology review", refs:["BINV-d"]},
      {id:"w_er",   label:"Determination of tumor ER/PR status and HER2 status", refs:["BINV-e"]},
      {id:"w_gen",  label:"Genetic counseling and testing (hereditary risk / TNBC any age / olaparib candidate)", refs:["BINV-f"]},
      {id:"w_fert", label:"Address fertility and sexual health concerns as appropriate", refs:["BINV-g"]},
      {id:"w_preg", label:"Pregnancy test — all patients of childbearing potential (if pregnant → PREG-1)", refs:["BINV-g"]},
      {id:"w_dist", label:"Assess for distress", refs:["BINV-h"]},
      {id:"w_imgx", label:"Consider additional imaging only if signs/symptoms of metastatic disease or high-risk (BINV-18)", refs:["BINV-18"]},
    ],
    attrs:["BINV-I","BINV-A","BINV-C","BINV-18"],xrefs:["PREG-1"],
    footnotes:[],
  },
  {
    id:"col_stage",zone:"staging",cardType:"decision",phase:"CLINICAL STAGE",
    title:"Clinical Stage",
    description:"Clinical TNM staging (AJCC 8th edition) stratifies patients into distinct treatment pathways based on tumor size, lymph node status, and distant metastases.",
    notes:"cT0,cN+,M0 = occult primary — breast MRI required. cT1–T4, ≥cN0,M0 = main localized disease population.",
    options:[
      {id:"st_ct0",  label:"Clinical Stage cT0, cN+, M0",refs:[],next:["col_occult"]},
      {id:"st_ct1t4",label:"Clinical Stage cT1–T4, ≥cN0, M0",refs:[],next:["col_criteria"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_occult",zone:"staging",cardType:"info",phase:"REFERENCE",
    title:"See NCCN Guidelines for Occult Primary",
    description:"Axillary nodal metastases without identifiable primary breast lesion. Managed per NCCN Occult Primary guidelines.",
    notes:"Occult primary breast cancer <1% of cases. Breast MRI identifies primary in ~60–70% of cases. MDT evaluation mandatory.",
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_criteria",zone:"criteria",cardType:"decision",phase:"TREATMENT DECISION",
    title:"Criteria for Preoperative Systemic Therapy (BINV-M)",
    description:"Key clinical decision: does the patient meet BINV-M criteria for neoadjuvant therapy, and does the patient elect to pursue this approach?",
    notes:"Neoadjuvant criteria: cT2 or cN+ M0; cT1c cN0 HER2+; cT1c cN0 TNBC. Both tumor biology and patient preference guide this decision. Neoadjuvant approach enables in-vivo response assessment and pCR evaluation.",
    options:[
      {id:"not_neoadj",label:"Not considering preoperative systemic therapy",refs:[],next:["col_locore"]},
      {id:"yes_neoadj",label:"Considering preoperative systemic therapy",refs:[],next:["col_neoadj_wu"]},
    ],
    attrs:["BINV-M"],xrefs:["BINV-M"],footnotes:[],
  },
  {
    id:"col_locore",zone:"locoregional",cardType:"decision",phase:"LOCOREGIONAL TREATMENT",
    title:"Locoregional Treatment for Those Not Considering Preoperative Systemic Therapy",
    description:"Surgical options for patients proceeding to primary surgery. BCS and mastectomy are oncologically equivalent for eligible patients.",
    notes:"BCS requires post-op whole-breast RT. Mastectomy may require PMRT based on final pathology. SLNB is standard for cN0. Discuss reconstruction before mastectomy — timing relative to RT affects complications.",
    options:[
      {id:"locore_bcs", label:"BCS ± surgical axillary staging ± oncoplastic reconstruction",refs:["Category 1","BINV-b","BINV-j","BINV-l","BINV-m","BINV-n","BINV-o","BINV-p"],next:["col_bcs"]},
      {id:"locore_mast",label:"Nipple-sparing, skin-sparing, or total mastectomy with surgical axillary staging ± reconstruction",refs:["Category 1","BINV-m","BINV-n","BINV-w"],next:["col_mast"]},
    ],
    attrs:[],xrefs:["BINV-2","BINV-3"],footnotes:["i"],
  },
  {
    id:"col_bcs",zone:"surgery",cardType:"decision",phase:"SURGERY",
    title:"BCS with Surgical Axillary Staging (category 1) ± Oncoplastic Reconstruction",
    description:"Breast-conserving surgery with negative margins plus SLNB/ALND, followed by mandatory whole-breast radiation. Oncoplastic techniques optimize cosmetic outcome.",
    notes:"SLNB standard for cN0. Negative margins required (no tumor at inked margin). APBI (category 1) for low-risk patients meeting criteria. Adjuvant systemic therapy per BINV-4 through BINV-11.",
    options:[
      {id:"bcs_neg",label:"Negative axillary nodes",refs:[],next:["col_bcs_adj_neg"]},
      {id:"bcs_1_3",label:"1–3 positive axillary nodes",refs:[],next:["col_bcs_adj_1_3"]},
      {id:"bcs_4p", label:"≥4 positive axillary nodes",refs:["BINV-o"],next:["col_adj_4p"]},
    ],
    attrs:["BINV-G","BINV-D","BINV-I"],xrefs:["BINV-4"],footnotes:[],
  },
  {
    id:"col_mast",zone:"surgery",cardType:"decision",phase:"SURGERY",
    title:"Total Mastectomy with Surgical Axillary Staging (category 1) ± Reconstruction",
    description:"Total removal of breast tissue with SLNB/ALND. PMRT determined by final pathological findings. Reconstruction timing must account for anticipated PMRT.",
    notes:"PMRT standard for ≥4 positive nodes, T3–T4, positive margins. Strongly consider for 1–3 positive nodes with high-risk features. Skin-sparing/nipple-sparing mastectomy oncologically appropriate in selected patients.",
    options:[
      {id:"mast_neg",   label:"Negative nodes, tumor ≤5 cm, margins ≥1 mm",refs:[],next:["col_mast_adj_neg"]},
      {id:"mast_1_3",   label:"1–3 positive axillary nodes",refs:["BINV-v"],next:["col_mast_adj_1_3"]},
      {id:"mast_4p",    label:"≥4 positive axillary nodes",refs:["BINV-o"],next:["col_adj_4p"]},
      {id:"mast_margin",label:"Margins positive",refs:[],next:["col_adj_4p"]},
    ],
    attrs:["BINV-D"],xrefs:["BINV-4"],footnotes:[],
  },
  {
    id:"col_bcs_adj_neg",zone:"adjuvant",cardType:"checklist",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Therapy — After BCS, Negative Axillary Nodes",
    description:"Post-BCS radiation and systemic therapy for pathologically node-negative disease.",
    notes:"WBRT ± boost is category 1. Consider APBI (cat. 1) for low-risk patients. Consider RT omission: ≥70y, HR+, HER2−, cN0, pT1 + ≥5y ET. Adjuvant systemic therapy per subtype (BINV-4 to BINV-11).",
    checkItems:[
      {id:"a1_wbrt",label:"WBRT ± boost to tumor bed (category 1 standard)",sub:["Consider comprehensive RNI for central/medial tumors","Consider for pT3 or high-risk pT2"],refs:["BINV-I"]},
      {id:"a1_apbi",label:"APBI/PBI — selected low-risk patients (category 1)",refs:["BINV-I"]},
      {id:"a1_omit",label:"Consider omitting RT: ≥70y, HR+, HER2−, cN0, pT1, planned ≥5y ET (category 1)",refs:[]},
      {id:"a1_sys", label:"Adjuvant systemic therapy per receptor subtype → BINV-4 through BINV-11",refs:["BINV-4","BINV-5","BINV-6","BINV-7","BINV-8","BINV-9","BINV-10","BINV-11"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_bcs_adj_1_3",zone:"adjuvant",cardType:"checklist",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Therapy — After BCS, 1–3 Positive Axillary Nodes",
    description:"Post-BCS adjuvant therapy for patients with 1–3 positive axillary nodes. Comprehensive regional nodal irradiation is strongly recommended.",
    notes:"WBRT + comprehensive RNI (axillary, supraclavicular, internal mammary) is standard. ALND may be omitted in eligible patients (ACOSOG Z0011 criteria). Intensified systemic therapy per subtype.",
    checkItems:[
      {id:"b13_alnd",label:"ALND may be omitted: cT1-T2, cN0, no preop chemo, 1-2 SLN+, BCS + tangential RT, systemic therapy planned",refs:[]},
      {id:"b13_wbrt",label:"WBRT ± boost + comprehensive RNI (axillary, supraclavicular, internal mammary)",refs:["BINV-I"]},
      {id:"b13_sys", label:"Adjuvant systemic therapy per subtype → BINV-4 through BINV-11",refs:["BINV-4","BINV-5","BINV-6","BINV-7","BINV-8","BINV-9","BINV-10","BINV-11"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_adj_4p",zone:"adjuvant",cardType:"checklist",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Therapy — ≥4 Positive Axillary Nodes (High-Risk Nodal Disease)",
    description:"Comprehensive locoregional RT and intensified adjuvant systemic therapy required for ≥4 positive axillary nodes.",
    notes:"WBRT/chest wall + comprehensive RNI is category 1. ALND standard. Consider intensified systemic therapy: abemaciclib (HR+), T-DM1 (HER2+), capecitabine/olaparib (TNBC).",
    checkItems:[
      {id:"b4p_rt",  label:"WBRT/chest wall + boost (cat. 1) + comprehensive RNI (axillary, supraclavicular, internal mammary nodes)",refs:["BINV-I"]},
      {id:"b4p_alnd",label:"ALND level I/II",refs:["BINV-D"]},
      {id:"b4p_sys", label:"Intensified adjuvant systemic therapy per subtype → BINV-4 through BINV-11",refs:["BINV-4","BINV-5","BINV-6","BINV-7","BINV-8","BINV-9","BINV-10","BINV-11"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_mast_adj_neg",zone:"adjuvant",cardType:"checklist",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Therapy — After Mastectomy, Negative Nodes, Tumor ≤5 cm",
    description:"Low-risk pathology after mastectomy — no PMRT required under standard criteria.",
    notes:"No RT standard for negative nodes, tumor ≤5 cm, margins ≥1 mm. Consider RT if additional high-risk features on final pathology. Adjuvant systemic therapy per subtype.",
    checkItems:[
      {id:"mn_nort",  label:"No RT — standard (negative nodes, tumor ≤5 cm, margins ≥1 mm)",refs:[]},
      {id:"mn_conRT", label:"Consider RT to chest wall if additional high-risk features present",refs:["BINV-I"]},
      {id:"mn_sys",   label:"Adjuvant systemic therapy per subtype → BINV-4 through BINV-11",refs:["BINV-4"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_mast_adj_1_3",zone:"adjuvant",cardType:"checklist",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Therapy — After Mastectomy, 1–3 Positive Axillary Nodes",
    description:"Intermediate nodal disease after mastectomy. PMRT is strongly recommended.",
    notes:"Strongly consider RT to chest wall + comprehensive RNI including internal mammary nodes. Multiple RCTs and meta-analyses support PMRT benefit for 1–3 positive nodes. Systemic therapy per subtype.",
    checkItems:[
      {id:"m13_rt", label:"Strongly consider RT: chest wall + comprehensive RNI (axillary, supraclavicular, internal mammary)",refs:["BINV-I"]},
      {id:"m13_sys",label:"Adjuvant systemic therapy per subtype → BINV-4 through BINV-11",refs:["BINV-4"]},
    ],
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_neoadj_wu",zone:"neoadjuvant",cardType:"checklist",phase:"NEOADJUVANT WORKUP",
    title:"Additional Workup Prior to Preoperative Systemic Therapy (BINV-12)",
    description:"Pre-treatment workup before initiating neoadjuvant systemic therapy. Baseline documentation, axillary staging, and clip placement are essential.",
    notes:"Image-guided clip in primary tumor is mandatory before neoadjuvant therapy. Clip axillary nodes biopsied to enable targeted axillary dissection (TAD). HR and HER2 from core biopsy determines neoadjuvant regimen (BINV-M 1).",
    checkItems:[
      {id:"na_ax",  label:"Axillary assessment",sub:["Physical exam","Axillary ultrasound","Percutaneous biopsy of suspicious nodes","Clip biopsied node(s)"],refs:["BINV-D"]},
      {id:"na_cbc", label:"CBC · Comprehensive metabolic panel · Liver function tests",refs:[]},
      {id:"na_bx",  label:"Core biopsy of primary tumor with image-detectable clip placement",refs:[]},
      {id:"na_err", label:"ER/PR and HER2 status confirmation on core biopsy",refs:["BINV-A"]},
      {id:"na_stg", label:"Systemic staging if clinically indicated",refs:[]},
    ],
    options:[
      {id:"na_operable",  label:"Operable tumors → Breast and Axillary Evaluation Prior to Preop Systemic Therapy (BINV-13)",refs:["BINV-13"],next:["col_neoadj_rx"]},
      {id:"na_inoperable",label:"Inoperable tumors → Preoperative Systemic Therapy (BINV-15)",refs:["BINV-15"],next:["col_neoadj_rx"]},
    ],
    attrs:["BINV-I"],xrefs:["BINV-12"],footnotes:[],
  },
  {
    id:"col_neoadj_rx",zone:"neoadjuvant",cardType:"decision",phase:"SYSTEMIC THERAPY",
    title:"Preoperative Systemic Therapy by HR and HER2 Status (BINV-M 1)",
    description:"Neoadjuvant regimen selection driven by HR and HER2 status. pCR (ypT0/is ypN0) is the primary endpoint and is associated with improved survival in HER2+ and TNBC.",
    notes:"HR+/HER2−: anthracycline/taxane ± CDK4/6 inhibitor. HER2+: trastuzumab+pertuzumab + chemo (cat. 1). TNBC: pembrolizumab + carbo + paclitaxel → AC/EC (KEYNOTE-522, cat. 1 for ≥cT2 or N+).",
    options:[
      {id:"rx_hrp_her2n",label:"HR-positive / HER2-negative → Anthracycline/taxane ± CDK4/6 inhibitor",refs:["BINV-M 1"],next:["col_post_neoadj_surg"]},
      {id:"rx_her2p",    label:"HER2-positive → HP (trastuzumab + pertuzumab) + chemotherapy",refs:["BINV-M 1"],next:["col_post_neoadj_surg"]},
      {id:"rx_tnbc",     label:"HR-negative / HER2-negative (TNBC) → Pembrolizumab + carbo + paclitaxel → AC/EC",refs:["BINV-M 1"],next:["col_post_neoadj_surg"]},
    ],
    attrs:["BINV-L","BINV-M 1"],xrefs:["BINV-M 1"],footnotes:[],
  },
  {
    id:"col_post_neoadj_surg",zone:"neoadjuvant",cardType:"decision",phase:"SURGERY",
    title:"Surgical Treatment & Adjuvant Therapy After Preoperative Systemic Therapy (BINV-14)",
    description:"After neoadjuvant therapy, surgical approach is re-evaluated. Pathologic response (pCR vs residual disease) guides post-surgical adjuvant therapy.",
    notes:"BCS may become feasible after effective downsizing. Use targeted axillary dissection (TAD) in previously cN+ patients. pCR = ypT0/is ypN0 on surgical specimen.",
    options:[
      {id:"post_bcs", label:"BCS possible → BCS with surgical axillary staging (BINV-D) ± oncoplastic reconstruction",refs:["BINV-D","BINV-I"],next:["col_post_adj"]},
      {id:"post_mast",label:"BCS not possible → Mastectomy and surgical axillary staging (BINV-D) ± reconstruction",refs:["BINV-D","BINV-H","BINV-I"],next:["col_post_adj"]},
    ],
    attrs:["BINV-D"],xrefs:["BINV-14","BINV-16"],footnotes:[],
  },
  {
    id:"col_post_adj",zone:"adjuvant",cardType:"decision",phase:"ADJUVANT THERAPY",
    title:"Adjuvant Systemic Therapy After Preoperative Systemic Therapy (BINV-16)",
    description:"Post-neoadjuvant adjuvant therapy based on receptor subtype AND pathologic response. Residual disease triggers escalation.",
    notes:"HER2+ residual: T-DM1 14 cycles (KATHERINE, cat. 1). TNBC residual: capecitabine 8 cycles (CREATE-X, cat. 1). gBRCA+ residual: olaparib 1y (OlympiA). HR+ high-risk N+: abemaciclib 2y (MonarchE).",
    options:[
      {id:"pna_hrp_her2n",label:"HR-positive / HER2-negative → ET ± abemaciclib (high-risk N+) ± olaparib (gBRCA+)",refs:["BINV-16"],next:["col_followup"]},
      {id:"pna_hrn_her2p",label:"HR-negative / HER2-positive → Complete 1y anti-HER2 ± T-DM1 (residual disease)",refs:["BINV-16"],next:["col_followup"]},
      {id:"pna_hrp_her2p",label:"HR-positive / HER2-positive → ET + complete 1y anti-HER2 ± T-DM1 (residual)",refs:["BINV-16"],next:["col_followup"]},
      {id:"pna_tnbc",     label:"HR-negative / HER2-negative (TNBC) → Capecitabine (residual) ± pembrolizumab ± olaparib",refs:["BINV-16"],next:["col_followup"]},
    ],
    attrs:[],xrefs:["BINV-16"],footnotes:[],
  },
  {
    id:"col_followup",zone:"adjuvant",cardType:"checklist",phase:"FOLLOW-UP",
    title:"Follow-Up (BINV-17)",
    description:"Structured follow-up and surveillance for patients who have completed primary treatment.",
    notes:"Routine CT/PET/bone scan for surveillance in asymptomatic patients is NOT recommended. Annual mammography is the cornerstone. New symptoms should be promptly evaluated.",
    checkItems:[
      {id:"fu1",label:"History and physical exam: every 3–6 mo (yr 1–3) → every 6–12 mo (yr 4–5) → annually"},
      {id:"fu2",label:"Annual mammography (bilateral or ipsilateral per surgery type)"},
      {id:"fu3",label:"Annual breast MRI for high-risk patients or inadequate mammographic evaluation"},
      {id:"fu4",label:"Bone density assessment for patients on aromatase inhibitors"},
      {id:"fu5",label:"Monitor for treatment toxicity: endocrine effects, cardiac function, peripheral neuropathy"},
      {id:"fu6",label:"Genetic counseling if not previously performed and criteria are met"},
      {id:"fu7",label:"Address psychosocial wellbeing, sexual health, fertility, and quality of life"},
    ],
    attrs:["BINV-17"],xrefs:["BINV-17"],footnotes:[],
  },
  {
    id:"col_recurrence",zone:"criteria",cardType:"info",phase:"REFERENCE",
    title:"Local / Regional Recurrence — See Recurrent Breast Cancer Algorithm",
    description:"Patients with local or regional recurrence require biopsy confirmation, reassessment of receptor status, restaging, and management per the Recurrent Breast Cancer algorithm.",
    notes:"Biopsy of recurrent lesion mandatory. Re-assess HR/HER2 — receptor conversion ~15–30% of cases. MDT review required.",
    attrs:[],xrefs:[],footnotes:[],
  },
  {
    id:"col_metastatic",zone:"criteria",cardType:"info",phase:"REFERENCE",
    title:"Metastatic (M1) Disease — See Stage IV / Metastatic Algorithm",
    description:"MBC management follows the NCCN Stage IV algorithm. Systemic therapy selected by receptor subtype including targeted agents, immunotherapy, and antibody-drug conjugates.",
    notes:"Re-biopsy strongly recommended. Re-assess ER/PR and HER2. Order germline BRCA1/2, tumor NGS, PD-L1, ESR1/PIK3CA for treatment planning. Palliative intent — goal of prolonged survival and quality of life.",
    attrs:[],xrefs:[],footnotes:[],
  },
];

const COL_MAP = Object.fromEntries(COLS.map(c=>[c.id,c]));

// ── Compute visible column IDs from current selections ─────────────────
function getVisible(sel) {
  const vis = ["toc","col_dx"];
  const dx = sel["col_dx"];
  if (!dx) return vis;
  if (dx==="dx_m0") {
    vis.push("col_workup","col_stage");
    const st = sel["col_stage"];
    if (st==="st_ct0") { vis.push("col_occult"); }
    else if (st==="st_ct1t4") {
      vis.push("col_criteria");
      const cr = sel["col_criteria"];
      if (cr==="not_neoadj") {
        vis.push("col_locore");
        const lr = sel["col_locore"];
        if (lr==="locore_bcs") {
          vis.push("col_bcs");
          const bcs = sel["col_bcs"];
          if (bcs==="bcs_neg") vis.push("col_bcs_adj_neg");
          else if (bcs==="bcs_1_3") vis.push("col_bcs_adj_1_3");
          else if (bcs==="bcs_4p") vis.push("col_adj_4p");
        } else if (lr==="locore_mast") {
          vis.push("col_mast");
          const mst = sel["col_mast"];
          if (mst==="mast_neg") vis.push("col_mast_adj_neg");
          else if (mst==="mast_1_3") vis.push("col_mast_adj_1_3");
          else if (mst==="mast_4p"||mst==="mast_margin") vis.push("col_adj_4p");
        }
      } else if (cr==="yes_neoadj") {
        vis.push("col_neoadj_wu");
        if (sel["col_neoadj_wu"]) {
          vis.push("col_neoadj_rx");
          if (sel["col_neoadj_rx"]) {
            vis.push("col_post_neoadj_surg");
            if (sel["col_post_neoadj_surg"]) {
              vis.push("col_post_adj");
              if (sel["col_post_adj"]) vis.push("col_followup");
            }
          }
        }
      }
    }
  } else if (dx==="dx_rec") vis.push("col_recurrence");
  else if (dx==="dx_m1") vis.push("col_metastatic");
  return vis;
}

function defaultSel() {
  const s={};
  COLS.forEach(c=>{
    if (c.options?.length>0) s[c.id]=c.options[0].id;
  });
  return s;
}

function defaultSelForCols(cols) {
  const s = {};
  cols.forEach((c) => {
    if (c.options?.length > 0) s[c.id] = c.options[0].id;
  });
  return s;
}

function categoryToZone(category) {
  const m = {
    entry: "toc",
    diagnosis: "staging",
    precancer: "criteria",
    early: "criteria",
    stage: "criteria",
    treatment: "locoregional",
    advanced: "neoadjuvant",
    meta: "adjuvant",
  };
  return m[category] || "staging";
}

function buildColsFromFlatTreeData(sourceData) {
  const tree = sourceData?.tree;
  if (!tree?.nodes?.length) return null;
  const nodes = tree.nodes;
  const edges = tree.edges || [];
  const nodeMap = new Map(nodes.map((n) => [String(n.id), n]));
  const out = new Map();
  const indeg = new Map();
  nodes.forEach((n) => indeg.set(String(n.id), 0));
  edges.forEach((e) => {
    const s = String(e.source);
    const t = String(e.target);
    out.set(s, [...(out.get(s) || []), t]);
    indeg.set(t, (indeg.get(t) || 0) + 1);
  });
  const root = nodes.find((n) => (indeg.get(String(n.id)) || 0) === 0);
  const rootId = root ? String(root.id) : String(nodes[0].id);

  const cols = [
    {
      id: "toc",
      zone: "toc",
      cardType: "toc",
      phase: "TABLE OF CONTENTS",
      title: "Table of Contents",
      description: sourceData?.meta?.description || "",
      notes: sourceData?.meta?.name || "",
      tocEntries: [{ id: rootId, label: sourceData?.meta?.name || "Clinical Pathway" }],
      attrs: [],
      xrefs: [],
      footnotes: [],
    },
  ];

  nodes.forEach((n) => {
    const id = String(n.id);
    const children = out.get(id) || [];
    const label = n.data?.label || id;
    const detail = n.data?.detail || n.data?.content || "";
    const phase = (n.data?.sublabel || n.category || "OTHER").toUpperCase();
    cols.push({
      id: `col_${id}`,
      zone: categoryToZone(n.category),
      cardType: children.length > 0 ? "decision" : "info",
      phase,
      title: label,
      description: detail,
      notes: n.data?.attribute_text || "",
      options: children.map((cid) => ({
        id: `opt_${id}_${cid}`,
        label: nodeMap.get(cid)?.data?.label || cid,
        refs: [],
        next: [`col_${cid}`],
      })),
      attrs: [],
      xrefs: [],
      footnotes: [],
    });
  });

  return { type: "esmo", cols, rootColId: `col_${rootId}` };
}

function getVisibleDynamic(sel, colMap, rootColId) {
  const vis = ["toc"];
  if (!rootColId || !colMap[rootColId]) return vis;
  let current = rootColId;
  const seen = new Set();
  while (current && !seen.has(current) && colMap[current]) {
    seen.add(current);
    vis.push(current);
    const opts = colMap[current].options || [];
    if (!opts.length) break;
    const chosen = sel[current] || opts[0].id;
    const nextCol = (opts.find((o) => o.id === chosen) || opts[0])?.next?.[0];
    if (!nextCol) break;
    current = nextCol;
  }
  return vis;
}

/** Serialized COLS JSON (e.g. CervicalCancerCols): follow option.next; checklist-only cards advance to next row in cols[] (workup → stage). */
function getVisibleSerializedCols(sel, colMap, orderedCols, entryColId) {
  const vis = ["toc"];
  const seen = new Set(["toc"]);

  function append(id) {
    if (!id || !colMap[id] || seen.has(id)) return;
    seen.add(id);
    vis.push(id);
  }

  function walk(id) {
    if (!id || !colMap[id] || seen.has(id)) return;
    append(id);
    const col = colMap[id];

    if (col.options?.length) {
      const chosen = sel[col.id] || col.options[0].id;
      const opt = col.options.find((o) => o.id === chosen) || col.options[0];
      const nexts = opt.next || [];
      nexts.forEach((nid) => walk(nid));
      return;
    }

    if (col.cardType === "checklist" && (!col.options || col.options.length === 0)) {
      const idx = orderedCols.findIndex((c) => c.id === id);
      if (idx !== -1 && idx + 1 < orderedCols.length) {
        const nxtId = orderedCols[idx + 1].id;
        if (nxtId !== "toc") walk(nxtId);
      }
    }
  }

  walk(entryColId);
  return vis;
}

function resolveVisibleIds(sel, pathwayConfig, runtimeColMap, runtimeCols) {
  if (!pathwayConfig) return getVisible(sel);
  if (pathwayConfig.type === "esmo") {
    return getVisibleDynamic(sel, runtimeColMap, pathwayConfig.rootColId);
  }
  if (pathwayConfig.type === "cols") {
    return getVisibleSerializedCols(sel, runtimeColMap, runtimeCols, pathwayConfig.rootColId);
  }
  return getVisible(sel);
}

// ── Footnote text definitions ──────────────────────────────────────────
// Source: NCCN Invasive Breast Cancer guideline footnotes (page footers)
const FN = {
  "a": "Principles of Biomarker Testing. See NCCN Guidelines for Breast Cancer, BINV-A.",
  "b": "Principles of Radiotherapy. See NCCN Guidelines for Breast Cancer, BINV-I.",
  "c": "Special Populations. See NCCN Guidelines for Breast Cancer, BINV-C.",
  "d": "See BINV-A for principles of endocrine therapy selection and sequencing.",
  "e": "Principles of Biomarker Testing (BINV-A). ER/PR and HER2 status must be confirmed on diagnostic core biopsy specimen.",
  "f": "For risk criteria, see NCCN Guidelines for Genetic/Familial High-Risk Assessment: Breast, Ovarian, Pancreatic and Prostate.",
  "g": "For Fertility and Birth Control, see BINV-C. The general considerations for fertility and sexual health/function outlined for specific populations in NCCN Guidelines for Adolescent and Young Adult (AYA) Oncology and NCCN Guidelines for Survivorship are applicable to all patients diagnosed with breast cancer.",
  "h": "Refer to the NCCN Guidelines for Distress Management (DIS-A) for the NCCN Distress Thermometer and Problem List, which includes social determinants of health.",
  "i": "See discussion for a comprehensive review of the data supporting locoregional treatment options and selection criteria.",
  "j": "Oncoplastic techniques include volume displacement and volume replacement procedures. See BINV-G for patient selection criteria.",
  "k": "See BINV-D for discussion of axillary surgical procedures, indications, and contraindications.",
  "l": "See BINV-I for principles of radiation therapy, including dose, fractionation, and field selection.",
  "m": "See BINV-N for tumor biology considerations relevant to systemic therapy selection.",
  "n": "See BINV-O for definition of menopausal status and methods of assessment.",
  "o": "See BINV-O for definition of menopausal status. Ovarian function suppression (OFS) indications per SOFT/TEXT trial data.",
  "p": "See BINV-P for additional systemic therapy considerations including CDK4/6 inhibitors.",
  "q": "See BINV-Y for 21-gene recurrence score (Oncotype DX) use and interpretation.",
  "u": "See discussion for comprehensive review of post-mastectomy radiation therapy (PMRT) indications and evidence.",
  "v": "Consider comprehensive locoregional irradiation including internal mammary, supraclavicular, and axillary nodes.",
  "w": "See BINV-W for nipple-sparing mastectomy patient selection criteria.",
  "W": "For preoperative systemic therapy regimens by receptor subtype, see BINV-M 1.",
  "x": "For patients with ductal/NST, lobular, mixed, micropapillary, or metaplastic histology.",
  "y": "Favorable histologic subtypes: pure tubular, pure mucinous, pure cribriform, adenoid cystic (conventional type). These have lower risk of nodal involvement and distant recurrence.",
  "z": "See BINV-11 for adjuvant therapy recommendations for patients with favorable histologic subtypes.",
  "uu": "CBC and comprehensive metabolic panel including liver function tests required before initiating neoadjuvant therapy.",
  "ww": "Consider systemic staging imaging (CT chest/abdomen/pelvis ± bone scan) if clinically indicated by symptoms or high-risk features.",
  "b": "Principles of Radiotherapy (BINV-I). See NCCN Guidelines for Breast Cancer.",
  "aa": "See discussion for data on omission of axillary lymph node dissection.",
  "bb": "See BINV-B for breast imaging interpretation and reporting.",
  "cc": "Consider participation in a clinical trial.",
  "dd": "All recommendations are category 2A unless otherwise indicated.",
  "ee": "See BINV-E for breast reconstruction options and timing considerations.",
  "ff": "See BINV-F for post-mastectomy radiotherapy and pathology.",
  "gg": "Consider multidisciplinary tumor board review for complex cases.",
  "hh": "See NCCN Guidelines for Survivorship for long-term follow-up and late effects management.",
  "ii": "Imaging-guided biopsy clip placement in the primary breast tumor is mandatory before initiating neoadjuvant therapy.",
  "jj": "Targeted axillary dissection (TAD) = SLNB + removal of clipped biopsied node.",
  "kk": "Pathologic complete response (pCR) is defined as ypT0/is ypN0 on the surgical specimen.",
  "ll": "See BINV-16 for post-neoadjuvant adjuvant therapy escalation/de-escalation per subtype and pathologic response.",
  "mm": "For HER2-positive disease with residual invasive disease: T-DM1 (ado-trastuzumab emtansine) for 14 cycles (KATHERINE trial, category 1).",
  "nn": "For TNBC with residual invasive disease: capecitabine for 6–8 cycles (CREATE-X trial, category 1).",
  "oo": "For germline BRCA1/2-mutated HER2-negative high-risk disease: olaparib for 1 year (OlympiA trial, category 1).",
  "pp": "For HR-positive HER2-negative high-risk node-positive disease: abemaciclib for 2 years + endocrine therapy (MonarchE trial, category 1).",
  "qq": "See BINV-17 for detailed follow-up schedule and surveillance imaging recommendations.",
};

// ── Tag chip — BINV/xref tags are clickable (open footnote panel) ─────
// Letter footnote keys (a,b,c…) are shown as small plain refs, NOT clickable tags
function Tag({ code, onBinvClick, refLookup = REF }) {
  const isXref = refLookup[code]?.startsWith("→");
  const isCat  = code.startsWith("Category");
  // BINV-* and xref tags: clickable, open the footnote/ref panel
  return (
    <span
      title={refLookup[code]||code}
      onClick={onBinvClick ? (e=>{e.stopPropagation();onBinvClick(code);}) : undefined}
      style={{
        display:"inline-block",
        background:isCat?"#E8F5EC":isXref?"#E6F4EF":"#E8F0FB",
        border:`1px solid ${isCat?"#8CCCAA":isXref?"#9CCEB4":"#ACC6E8"}`,
        borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700,
        color:isCat?"#0D5C3E":isXref?T.green:T.blue,
        cursor:onBinvClick?"pointer":"default",
        transition:"background 0.12s",
      }}
      onMouseEnter={e=>{if(onBinvClick){e.currentTarget.style.opacity="0.75";}}}
      onMouseLeave={e=>{if(onBinvClick){e.currentTarget.style.opacity="1";}}}
    >{isXref?"→ ":""}{code}</span>
  );
}

// ── Ref panel — bottom drawer for BINV tag click ──────────────────────
function RefPanel({ refKey, onClose, refLookup = REF, fnLookup = FN }) {
  const [height, setHeight] = useState(DEFAULT_REF_PANEL_HEIGHT);
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startH   = useRef(0);

  // All hooks must be called before any conditional return
  const onMouseDown = useCallback((e) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    e.preventDefault();
  }, [height]);

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const newH = Math.max(MIN_REF_PANEL_HEIGHT, Math.min(DEFAULT_REF_PANEL_HEIGHT, startH.current + delta));
    setHeight(newH);
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    const handleMouseMove = (e) => onMouseMove(e);
    const handleMouseUp = () => onMouseUp();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  if (!refKey) return null;
  const isBinv = refLookup[refKey];
  const isFn   = fnLookup[refKey];
  if (!isBinv && !isFn) return null;

  const title  = refKey;
  const text   = isBinv ? refLookup[refKey] : fnLookup[refKey];
  const isXref = isBinv && refLookup[refKey]?.startsWith("→");

  return (
    <>
      <div onClick={onClose} style={{position:"absolute",inset:0,zIndex:1002}}/>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          position:"absolute",bottom:0,left:0,right:0,
          zIndex:1003,height:height,
          background:"#fff",
          borderTop:"2px solid #C4D4EC",
          borderRadius:"12px 12px 0 0",
          boxShadow:"0 -8px 40px rgba(8,20,45,0.18)",
          fontFamily:"'DM Sans','IBM Plex Sans',system-ui,sans-serif",
          display:"flex",flexDirection:"column",
          overflow:"hidden",
        }}
      >
        <div
          onMouseDown={onMouseDown}
          style={{height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ns-resize",flexShrink:0,background:"#F8FAFD",borderBottom:"1px solid #EEF3FA",userSelect:"none"}}
        >
          <div style={{width:36,height:4,borderRadius:2,background:"#C4D4EC"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 8px",borderBottom:"1px solid #EEF3FA",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Footnotes</span>
            <span style={{background:isXref?"#E6F4EF":"#E8F0FB",border:`1px solid ${isXref?"#9CCEB4":"#ACC6E8"}`,borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:800,color:isXref?T.green:T.blue}}>
              {isXref?"→ ":""}{title}
            </span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:20,lineHeight:1,padding:"2px 8px",borderRadius:6}}>×</button>
        </div>
        <div style={{padding:"16px 20px 20px",overflowY:"auto",flex:1}}>
          <p style={{fontSize:14,color:T.text,lineHeight:1.8,margin:0}}>{text}</p>
        </div>
      </div>
    </>
  );
}


// ── Card ───────────────────────────────────────────────────────────────
function Card({ col, sel, chk, onSel, onChk, onBinvClick, cardRef, isActive, onActivate, onTextHover, onTextMove, onTextLeave, refLookup = REF }) {
  const hdr = PH[col.phase]||"#1A4776";
  const selOpt = sel[col.id];
  const checked = chk[col.id]||{};
  const activeBorder = isActive ? hdr : T.border;
  const activeShadow = isActive
    ? "0 0 0 2px rgba(43,101,168,0.16), 0 8px 24px rgba(20,40,80,0.12)"
    : "0 2px 10px rgba(20,40,80,0.06)";
  const cardBaseStyle = {
    position:"relative",
    background:"#fff",
    border:`1.8px solid ${activeBorder}`,
    borderRadius:14,
    boxShadow:activeShadow,
    overflow:"hidden",
    fontFamily:"inherit",
    transition:"border-color 0.15s, box-shadow 0.15s",
  };

  const HeaderBar = ()=>(
    <div style={{background:hdr,padding:"9px 14px 8px"}}>
      <span style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)"}}>{col.phase}</span>
    </div>
  );

  // TOC
  if (col.cardType==="toc") return (
    <div ref={cardRef} onClick={() => onActivate?.(col.id)} style={{...cardBaseStyle,width:210,border:isActive ? "1.8px solid #2B7D5E" : `1.5px solid ${T.border}`,boxShadow:isActive ? "0 0 0 2px rgba(43,125,94,0.16), 0 8px 24px rgba(20,40,80,0.12)" : "0 2px 12px rgba(20,40,80,0.06)"}}>
      <HeaderBar/>
      <div style={{padding:"14px 16px 16px"}}>
        {col.tocEntries.map(e=>(
          <div key={e.id} onClick={()=>{}} style={{display:"flex",alignItems:"center",background:"rgba(43,125,94,0.12)",border:"1px solid rgba(43,125,94,0.3)",borderRadius:10,padding:"11px 18px",transition:"all 0.15s"}}>
            <span style={{fontSize:14,fontWeight:700,color:"#2B7D5E"}}>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Info (terminal/reference)
  if (col.cardType==="info") return (
    <div ref={cardRef} onClick={() => onActivate?.(col.id)} style={{...cardBaseStyle,width:240,background:"#F8FAFB",border:isActive?`1.8px solid ${T.blueMid}`:"1.5px dashed #B0C4D8"}}>
      <HeaderBar/>
      <div style={{padding:"12px 14px 14px"}}>
        <div style={{fontSize:13,fontWeight:600,color:T.textSec,lineHeight:1.4}}>{col.title}</div>
      </div>
    </div>
  );

  // Checklist (workup steps — □ square, multi-checkable)
  // May also have ○ radio options at bottom (hybrid: neoadjuvant workup)
  if (col.cardType==="checklist") return (
    <div ref={cardRef} onClick={() => onActivate?.(col.id)} style={{...cardBaseStyle,width:300}}>
      <HeaderBar/>
      <div style={{padding:"10px 14px 4px"}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,lineHeight:1.35}}>{col.title}</div>
      </div>
      {/* □ Square checkbox items — multi-checkable, track workup completion */}
      {col.checkItems?.map(item=>{
        const iscked = checked[item.id]!==false;
        return (
          <div key={item.id} style={{padding:"0 14px"}}>
            <div onClick={()=>onChk(col.id,item.id,!iscked)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"3px 4px",borderRadius:5,marginBottom:2}}>
              {/* Square checkbox (□) */}
              <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${iscked?"#1A7A52":"#B0C4D8"}`,background:iscked?"#1A7A52":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:0,transition:"all 0.12s"}}>
                {iscked && <span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <span style={{fontSize:11.5,color:iscked?T.text:T.textMuted,lineHeight:1.45,fontWeight:iscked?500:400,transition:"color 0.12s"}}>
                  <span
                    onMouseEnter={(e) => onTextHover?.(e, item.label)}
                    onMouseMove={onTextMove}
                    onMouseLeave={onTextLeave}
                  >
                    {item.label.length>62?item.label.slice(0,62)+"…":item.label}
                  </span>
                </span>
                {/* Per-item BINV refs — shown below the item label */}
                {item.refs?.length>0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}} onClick={e=>e.stopPropagation()}>
                    {item.refs.map(r=><Tag key={r} code={r} onBinvClick={onBinvClick} refLookup={refLookup}/>)}
                  </div>
                )}
              </div>
            </div>
            {iscked&&item.sub?.map((s,si)=>(
              <div key={si} style={{marginLeft:23,marginBottom:1,fontSize:10.5,color:T.textSec,lineHeight:1.35,paddingLeft:6,borderLeft:"2px solid #C4D8E8"}}>› {s}</div>
            ))}
          </div>
        );
      })}
      {/* ○ Radio options at bottom (hybrid card — e.g. neoadjuvant workup) */}
      {col.options?.length>0 && (
        <div style={{borderTop:"1px solid #EEF3FA",margin:"8px 0 0",padding:"7px 14px 10px"}}>
          <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:5}}>已选 {selOpt?1:0} 项</div>
          {col.options.map(opt=>{
            const isSel=selOpt===opt.id;
            return (
              <div key={opt.id} onClick={()=>onSel(col.id,opt.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 7px",borderRadius:7,marginBottom:3,cursor:"pointer",background:isSel?`${hdr}12`:"transparent",border:isSel?`1px solid ${hdr}30`:"1px solid transparent",transition:"all 0.12s"}}>
                <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${isSel?hdr:"#B0C4D8"}`,background:isSel?hdr:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:0,transition:"all 0.12s"}}>
                  {isSel&&<div style={{width:5,height:5,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div>
                  <span
                    style={{fontSize:11.5,color:isSel?hdr:T.textSec,fontWeight:isSel?600:400,lineHeight:1.4}}
                    onMouseEnter={(e) => onTextHover?.(e, opt.label)}
                    onMouseMove={onTextMove}
                    onMouseLeave={onTextLeave}
                  >
                    {opt.label}
                  </span>
                  {opt.refs?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>{opt.refs.map(r=><Tag key={r} code={r} onBinvClick={onBinvClick} refLookup={refLookup}/>)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{height:8}}/>
    </div>
  );

  // Decision — ○ radio only, drives path expansion
  return (
    <div ref={cardRef} onClick={() => onActivate?.(col.id)} style={{...cardBaseStyle,width:290}}>
      <HeaderBar/>
      <div style={{padding:"10px 14px 4px"}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,lineHeight:1.35}}>{col.title}</div>
      </div>
      <div style={{padding:"2px 14px 6px"}}>
        <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:5}}>已选 {selOpt?1:0} 项</div>
        {col.options.map(opt=>{
          const isSel=selOpt===opt.id;
          return (
            <div key={opt.id} onClick={()=>onSel(col.id,opt.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 7px",borderRadius:7,marginBottom:4,cursor:"pointer",background:isSel?`${hdr}14`:"transparent",border:isSel?`1px solid ${hdr}30`:"1px solid transparent",transition:"all 0.12s"}}>
              {/* ○ Circle radio — single-select, drives path expansion */}
              <div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${isSel?hdr:"#B0C4D8"}`,background:isSel?hdr:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:0,transition:"all 0.12s"}}>
                {isSel&&<div style={{width:5,height:5,borderRadius:"50%",background:"#fff"}}/>}
              </div>
              <div style={{flex:1}}>
                <span
                  style={{fontSize:12,color:isSel?hdr:T.textSec,fontWeight:isSel?600:400,lineHeight:1.4}}
                  onMouseEnter={(e) => onTextHover?.(e, opt.label)}
                  onMouseMove={onTextMove}
                  onMouseLeave={onTextLeave}
                >
                  {opt.label}
                </span>
                {opt.refs?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>{opt.refs.map(r=><Tag key={r} code={r} onBinvClick={onBinvClick} refLookup={refLookup}/>)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrowConnector({ active = false, width = 34 }) {
  return (
    <div style={{display:"flex",alignItems:"center",width,flexShrink:0,alignSelf:"center"}}>
      <div className={active ? "flow-arrow-line" : ""} style={{flex:1,height:2,background:active ? "transparent" : "#B8C7D8",borderTop:active ? "3px dashed #6D7BFF" : "none"}} />
      <div style={{width:0,height:0,borderTop:"6px solid transparent",borderBottom:"6px solid transparent",borderLeft:active ? "8px solid #6D7BFF" : "8px solid #B8C7D8"}}/>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────
export default function InvasiveBreastCancerNCCN({ sourceData, embedded = false }) {
  const pathwayConfig = useMemo(() => {
    if (sourceData?.meta?.source === "ESMO") {
      return buildColsFromFlatTreeData(sourceData);
    }
    if (Array.isArray(sourceData?.cols) && sourceData.cols.length >= 2) {
      const cols = sourceData.cols;
      const rootColId = cols[0]?.id === "toc" ? cols[1].id : cols[0].id;
      return {
        type: "cols",
        cols,
        rootColId,
        zones: sourceData.zones || {},
        refExtra: sourceData.ref_descriptions || {},
        fnExtra: sourceData.footnote_text || {},
      };
    }
    return null;
  }, [sourceData]);
  const runtimeCols = pathwayConfig?.cols || COLS;
  const runtimeColMap = useMemo(
    () => Object.fromEntries(runtimeCols.map((c) => [c.id, c])),
    [runtimeCols]
  );

  const refLookup = useMemo(
    () => ({ ...REF, ...(pathwayConfig?.type === "cols" ? pathwayConfig.refExtra : {}) }),
    [pathwayConfig]
  );
  const fnLookup = useMemo(
    () => ({ ...FN, ...(pathwayConfig?.type === "cols" ? pathwayConfig.fnExtra : {}) }),
    [pathwayConfig]
  );

  const [sel, setSel] = useState(() => defaultSelForCols(runtimeCols));
  const [chk, setChk] = useState(()=>{
    const s={};
    runtimeCols.forEach(c=>{if(c.checkItems){s[c.id]={};c.checkItems.forEach(i=>{s[c.id][i.id]=true;});}});
    return s;
  });
  const [refKey, setRefKey] = useState(null);
  const [activeCardId, setActiveCardId] = useState(() => pathwayConfig?.rootColId || "col_dx");
  const [zoom, setZoom] = useState(1);
  const [pathCollapsed, setPathCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, text: "", x: 0, y: 0 });
  const cardRefs = useRef({});
  const boardRef = useRef(null);
  const pinchRef = useRef({ distance: 0, zoomStart: 1 });
  const dataMeta = useMemo(() => sourceData?.meta || null, [sourceData]);

  const visibleIds = resolveVisibleIds(sel, pathwayConfig, runtimeColMap, runtimeCols);
  const visCols = visibleIds.map((id) => runtimeColMap[id]).filter(Boolean);

  // Group consecutive same-zone cols
  const zoneGroups = [];
  let zi=0;
  while(zi<visCols.length){
    const zone=visCols[zi].zone;
    let zj=zi;
    while(zj<visCols.length&&visCols[zj].zone===zone) zj++;
    zoneGroups.push({zone,cols:visCols.slice(zi,zj)});
    zi=zj;
  }

  const handleSel = useCallback((colId,optId)=>{
    setSel(prev=>{
      const next={...prev,[colId]:optId};
      // Reset downstream: set newly visible cols to their first option
      const newVis = resolveVisibleIds(next, pathwayConfig, runtimeColMap, runtimeCols);
      runtimeCols.forEach(c=>{if(!newVis.includes(c.id)&&c.options?.length>0)next[c.id]=c.options[0].id;});
      return next;
    });
  },[pathwayConfig, runtimeColMap, runtimeCols]);

  const handleChk = useCallback((colId,itemId,val)=>{
    setChk(prev=>({...prev,[colId]:{...prev[colId],[itemId]:val}}));
  },[]);

  // Build breadcrumb — show selected option label or card title
  const crumbs = visCols.map(col=>{
    const opt = col.options?.find(o=>o.id===sel[col.id]);
    return {colId:col.id, label:opt?.label||col.title};
  });

  useEffect(() => {
    const initSel = defaultSelForCols(runtimeCols);
    const initChk = {};
    runtimeCols.forEach((c) => {
      if (c.checkItems) {
        initChk[c.id] = {};
        c.checkItems.forEach((i) => { initChk[c.id][i.id] = true; });
      }
    });
    setSel(initSel);
    setChk(initChk);
    setActiveCardId(pathwayConfig?.rootColId || "col_dx");
  }, [runtimeCols, pathwayConfig?.rootColId]);

  const scrollTo = useCallback((colId)=>{
    cardRefs.current[colId]?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  },[]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2))), []);
  const clampZoom = useCallback((value) => Math.max(0.7, Math.min(1.8, +value.toFixed(2))), []);

  // Trackpad pinch zoom (Ctrl/Cmd + wheel in many browsers)
  const handleBoardWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom((z) => clampZoom(z * factor));
  }, [clampZoom]);

  // Touch pinch zoom (two-finger)
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 2) return;
    const [a, b] = e.touches;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchRef.current = { distance, zoomStart: zoom };
  }, [zoom]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length !== 2 || pinchRef.current.distance <= 0) return;
    e.preventDefault();
    const [a, b] = e.touches;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    setZoom(clampZoom(pinchRef.current.zoomStart * ratio));
  }, [clampZoom]);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current.distance = 0;
  }, []);

  const showTooltip = useCallback((e, text) => {
    if (!text) return;
    setTooltip({ visible: true, text, x: e.clientX + 12, y: e.clientY + 14 });
  }, []);
  const moveTooltip = useCallback((e) => {
    setTooltip((prev) => (prev.visible ? { ...prev, x: e.clientX + 12, y: e.clientY + 14 } : prev));
  }, []);
  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div style={{position:"relative",height:embedded?"100%":"100vh",minHeight:0,display:"flex",flexDirection:"column",background:"#F0F3F6",fontFamily:"'DM Sans','IBM Plex Sans',system-ui,sans-serif"}}>
      {/* Board */}
      <div
        ref={boardRef}
        onWheel={handleBoardWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{position:"relative",flex:1,minHeight:0,overflow:"auto",padding:"24px 28px 16px",display:"flex",alignItems:"flex-start",gap:0,background:"#F0F3F6",touchAction:"none"}}
      >
        <style>{`
          @keyframes flowArrowDash {
            from { background-position: 0 0; }
            to { background-position: 24px 0; }
          }
          .flow-arrow-line {
            background-image: repeating-linear-gradient(
              90deg,
              #6D7BFF 0 8px,
              transparent 8px 14px
            );
            background-size: 24px 3px;
            animation: flowArrowDash 0.8s linear infinite;
          }
        `}</style>
        <div style={{width:"max-content",transform:`scale(${zoom * BASE_CANVAS_SCALE})`,transformOrigin:"top left"}}>
          <div style={{display:"flex",alignItems:"center"}}>
            {zoneGroups.map((grp,gi)=>{
              const zm =
                pathwayConfig?.type === "cols" && pathwayConfig.zones?.[grp.zone]
                  ? pathwayConfig.zones[grp.zone]
                  : ZONES[grp.zone] || ZONES.staging;
              return (
                <div key={`${grp.zone}-${gi}`} style={{display:"flex",alignItems:"center"}}>
                  <div style={{
                    position:"relative",background:"#E9EEF2",
                    border:"none",
                    borderRadius:12,
                    padding:"54px 16px 18px",
                    display:"flex",alignItems:"center",gap:0,minHeight:120,
                  }}>
                    {/* Zone label strip */}
                    <div style={{
                      position:"absolute",top:0,left:0,right:0,
                      background:"#FFFFFF",color:"#111827",
                      fontSize:8.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",
                      padding:"4px 12px",whiteSpace:"nowrap",
                      borderRadius:"10px 10px 0 0",
                      textAlign:"left",
                      boxSizing:"border-box",
                      borderBottom:"1px solid #E5E7EB",
                      color:"#6B7280",
                    }}>{zm.label}</div>

                    {/* Cards with intra-zone arrows */}
                    {grp.cols.map((col,ci_idx)=>(
                      <div key={col.id} style={{display:"flex",alignItems:"center"}}>
                        <Card
                          col={col} sel={sel} chk={chk}
                          onSel={handleSel} onChk={handleChk}
                          onBinvClick={setRefKey}
                          isActive={activeCardId === col.id}
                          onActivate={setActiveCardId}
                          onTextHover={showTooltip}
                          onTextMove={moveTooltip}
                          onTextLeave={hideTooltip}
                          refLookup={refLookup}
                          cardRef={el=>{cardRefs.current[col.id]=el;}}
                        />
                        {ci_idx<grp.cols.length-1&&(
                          <ArrowConnector active={activeCardId === col.id} width={72} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Inter-zone arrow */}
                  {gi<zoneGroups.length-1&&(
                    <ArrowConnector active={activeCardId === grp.cols[grp.cols.length - 1]?.id} width={84} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{position:"absolute",right:24,top:12,zIndex:1004,display:"flex",gap:6,background:"#FFFFFFE6",backdropFilter:"blur(2px)",padding:6,border:"1px solid #D6E2F2",borderRadius:8,boxShadow:"0 6px 16px rgba(15,40,80,0.12)"}}>
        <button onClick={zoomOut} style={{border:"1px solid #BFD3EA",background:"#fff",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontWeight:700,color:T.blue}}>-</button>
        <span style={{fontSize:11,color:T.textSec,minWidth:46,textAlign:"center",lineHeight:"24px"}}>{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} style={{border:"1px solid #BFD3EA",background:"#fff",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontWeight:700,color:T.blue}}>+</button>
      </div>

      {/* Breadcrumb — clickable to scroll to any card */}
      <div style={{padding:0,background:"#F0F3F6"}}>
        <div style={{width:"100%",background:"#fff",borderTop:"1px solid #CCD8EE",borderRadius:0,padding:"8px 28px 2px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:pathCollapsed?0:4}}>
            <span style={{fontSize:10.5,fontWeight:800,color:T.textSec,textTransform:"uppercase",letterSpacing:"0.08em",marginRight:6,flexShrink:0}}>Current Path:</span>
            <button
              onClick={() => setPathCollapsed((v) => !v)}
              title={pathCollapsed ? "展开" : "收起"}
              style={{width:28,height:28,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",color:"#64748B",padding:0}}
            >
              <span style={{display:"inline-block",fontSize:18,lineHeight:1,transform:pathCollapsed ? "rotate(180deg)" : "none"}}>
                ▾
              </span>
            </button>
          </div>
          {!pathCollapsed && (
            <div style={{flexWrap:"wrap",display:"flex",alignItems:"center",gap:2}}>
              {crumbs.map((c,i)=>{
                const isCur=i===crumbs.length-1;
                return (
                  <span key={c.colId} style={{display:"flex",alignItems:"center",gap:2}}>
                    {i>0&&<span style={{color:"#ACC6E8",fontSize:14,margin:"0 3px"}}>›</span>}
                    <span
                      onClick={()=>scrollTo(c.colId)}
                      style={{fontSize:12,color:isCur?T.blue:T.textSec,fontWeight:isCur?700:400,cursor:"pointer",textDecoration:"underline",textDecorationColor:"transparent",transition:"text-decoration-color 0.15s"}}
                      onMouseEnter={(e)=>{ e.currentTarget.style.textDecorationColor=T.blue; showTooltip(e, c.label); }}
                      onMouseMove={moveTooltip}
                      onMouseLeave={(e)=>{ e.currentTarget.style.textDecorationColor="transparent"; hideTooltip(); }}
                    >
                      {c.label.length>35?c.label.slice(0,35)+"…":c.label}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {refKey&&<RefPanel refKey={refKey} onClose={()=>setRefKey(null)} refLookup={refLookup} fnLookup={fnLookup}/>}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 4000,
            pointerEvents: "none",
            background: "#1F2329",
            color: "#FFFFFF",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.3,
            maxWidth: 360,
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            whiteSpace: "normal",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
