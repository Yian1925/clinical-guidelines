import { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

// ─── Color palette by node category ───────────────────────────────────────────
const CATEGORY = {
  entry:     { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8", badge: "#DBEAFE", badgeText: "#1E40AF" },
  diagnosis: { bg: "#F0FDF4", border: "#22C55E", text: "#15803D", badge: "#DCFCE7", badgeText: "#166534" },
  precancer: { bg: "#FFF7ED", border: "#F97316", text: "#C2410C", badge: "#FFEDD5", badgeText: "#9A3412" },
  early:     { bg: "#F5F3FF", border: "#8B5CF6", text: "#6D28D9", badge: "#EDE9FE", badgeText: "#5B21B6" },
  stage:     { bg: "#FDF4FF", border: "#D946EF", text: "#A21CAF", badge: "#FAE8FF", badgeText: "#86198F" },
  treatment: { bg: "#F8FAFC", border: "#64748B", text: "#334155", badge: "#F1F5F9", badgeText: "#475569" },
  advanced:  { bg: "#FFF1F2", border: "#F43F5E", text: "#BE123C", badge: "#FFE4E6", badgeText: "#9F1239" },
  meta:      { bg: "#0F172A", border: "#475569", text: "#F8FAFC", badge: "#1E293B", badgeText: "#94A3B8" },
};

// ─── Raw node definitions ──────────────────────────────────────────────────────
const RAW_NODES = [
  {
    id: "1",
    category: "entry",
    label: "Positive Pap-smear / HPV-HR+ / Suspected Cervix",
    sublabel: "Initial Screening",
    detail: "Positive Pap-smear result, HPV high-risk positive test, or clinical suspicion of cervical pathology requiring further investigation.",
  },
  {
    id: "2",
    category: "diagnosis",
    label: "Colposcopy / Biopsy",
    sublabel: "Diagnostic Workup",
    detail: "Colposcopic examination with directed biopsy to characterize the lesion and determine degree of dysplasia or invasive carcinoma.",
  },
  {
    id: "3",
    category: "precancer",
    label: "CIN2 / CIN3",
    sublabel: "Precancerous Lesion",
    detail: "High-grade squamous intraepithelial lesion (CIN2/CIN3) confirmed on biopsy. Requires excisional or ablative treatment.",
  },
  {
    id: "4",
    category: "treatment",
    label: "Conisation",
    sublabel: "Treatment",
    detail: "Loop excision (LEEP/LLETZ) or cold-knife cone biopsy. Aims for negative surgical margins to reduce recurrence risk.",
  },
  {
    id: "5",
    category: "diagnosis",
    label: "Invasive Cervical Cancer",
    sublabel: "Confirmed Diagnosis",
    detail: "Histologically confirmed invasive carcinoma of the cervix. Further staging via MRI, PET-CT and multidisciplinary team review required.",
  },
  {
    id: "6",
    category: "early",
    label: "Early Disease",
    sublabel: "FIGO IA1 – IB2 / IIA1",
    detail: "Surgically resectable disease. Management depends on exact FIGO sub-stage, LVSI status, and fertility-preservation wishes.",
  },
  {
    id: "7",
    category: "stage",
    label: "FIGO IA1",
    sublabel: "Stage",
    detail: "Microscopically invasive carcinoma ≤3 mm depth, ≤7 mm horizontal spread. Treatment varies with LVSI status.",
  },
  {
    id: "8",
    category: "treatment",
    label: "No LVSI",
    sublabel: "Simple hysterectomy · Conisation",
    detail: "Simple (extrafascial) hysterectomy preferred.\nFertility-sparing: conisation only if margins negative on frozen section.\nNo lymphadenectomy required.",
  },
  {
    id: "9",
    category: "treatment",
    label: "LVSI Present",
    sublabel: "Hysterectomy + PLND ± PALND",
    detail: "Simple hysterectomy + pelvic lymph node dissection (PLND) ± para-aortic LND (PALND).\nFertility-sparing: trachelectomy + PLND.",
  },
  {
    id: "10",
    category: "stage",
    label: "FIGO IA2",
    sublabel: "Stage",
    detail: "Microscopically invasive carcinoma >3 mm and ≤5 mm depth, ≤7 mm horizontal spread.",
  },
  {
    id: "11",
    category: "treatment",
    label: "Radical / Simple Hysterectomy",
    sublabel: "Hysterectomy + PLND ± PALND · SLN",
    detail: "Options:\n• Radical hysterectomy\n• Simple hysterectomy\n• Trachelectomy + PLND ± PALND (fertility-sparing)\n• Sentinel lymph node (SLN) biopsy",
  },
  {
    id: "12",
    category: "stage",
    label: "FIGO IB1 + IIA1",
    sublabel: "Stage",
    detail: "Clinically visible lesion ≤4 cm (IB1) or vaginal involvement without parametrial extension (IIA1).",
  },
  {
    id: "13",
    category: "treatment",
    label: "Radical Hysterectomy + PLND",
    sublabel: "± PALND · SLN · Trachelectomy",
    detail: "• Radical hysterectomy + PLND ± PALND\n• SLN biopsy\n• Frozen section: trachelectomy if fertility desired and tumour ≤2 cm",
  },
  {
    id: "14",
    category: "stage",
    label: "FIGO IB2 / II / III",
    sublabel: "Stage",
    detail: "Tumour >4 cm (IB2), parametrial extension (IIA2, IIB), or pelvic wall / lower vaginal involvement (III).",
  },
  {
    id: "15",
    category: "treatment",
    label: "Chemoradiotherapy (CRT)",
    sublabel: "Primary Treatment",
    detail: "Concurrent platinum-based chemotherapy + external beam radiotherapy (EBRT) + brachytherapy.\nTailoring of radiation volume based on surgical staging or PET-CT.",
  },
  {
    id: "16",
    category: "treatment",
    label: "Neoadjuvant Chemotherapy",
    sublabel: "Followed by Surgery or RT",
    detail: "Platinum-based neoadjuvant chemotherapy (NACT) followed by radical surgery or definitive radiotherapy depending on response.",
  },
  {
    id: "17",
    category: "advanced",
    label: "Locally Advanced Disease",
    sublabel: "FIGO IVA",
    detail: "Tumour invading adjacent pelvic organs (bladder / rectum) but without distant metastases.",
  },
  {
    id: "18",
    category: "stage",
    label: "FIGO IVA",
    sublabel: "Stage",
    detail: "Invasion of bladder or rectal mucosa confirmed by biopsy.",
  },
  {
    id: "19",
    category: "treatment",
    label: "Chemo(RT) / Pelvic Exenteration",
    sublabel: "Chemotherapy ± RT",
    detail: "• Chemotherapy (C)RT for unresectable disease\n• Pelvic exenteration for selected cases with resectable fistula\nGoal: cure or durable local control.",
  },
  {
    id: "20",
    category: "meta",
    label: "Metastatic Disease",
    sublabel: "FIGO IVB",
    detail: "Distant metastases beyond the true pelvis. Primarily palliative intent; systemic therapy is mainstay.",
  },
  {
    id: "21",
    category: "stage",
    label: "FIGO IVB",
    sublabel: "Stage",
    detail: "Distant organ metastases (lung, liver, bone, distant lymph nodes).",
  },
  {
    id: "22",
    category: "treatment",
    label: "Chemotherapy + Bevacizumab",
    sublabel: "± Radiotherapy",
    detail: "• Cisplatin/carboplatin + paclitaxel + bevacizumab (VEGF inhibitor)\n• Pembrolizumab for PD-L1+/MSI-H (subsequent lines)\n• Palliative RT for symptomatic sites",
  },
];

const RAW_EDGES = [
  { source: "1", target: "2" },
  { source: "2", target: "3" },
  { source: "2", target: "5" },
  { source: "2", target: "17" },
  { source: "2", target: "20" },
  { source: "3", target: "4" },
  { source: "5", target: "6" },
  { source: "6", target: "7" },
  { source: "6", target: "10" },
  { source: "6", target: "12" },
  { source: "6", target: "14" },
  { source: "7", target: "8" },
  { source: "7", target: "9" },
  { source: "10", target: "11" },
  { source: "12", target: "13" },
  { source: "14", target: "15" },
  { source: "14", target: "16" },
  { source: "17", target: "18" },
  { source: "18", target: "19" },
  { source: "20", target: "21" },
  { source: "21", target: "22" },
];

// ─── Dagre layout ──────────────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H = 80;

function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 60, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const { x, y } = g.node(n.id);
      return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
    }),
    edges,
  };
}

// ─── Custom node component ─────────────────────────────────────────────────────
function ClinicalNode({ data, selected }) {
  const c = CATEGORY[data.category] || CATEGORY.treatment;
  return (
    <div
      style={{
        background: c.bg,
        border: `2px solid ${selected ? c.text : c.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        width: NODE_W,
        boxShadow: selected
          ? `0 0 0 3px ${c.border}44, 0 4px 20px ${c.border}33`
          : "0 1px 6px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: c.border, width: 8, height: 8 }} />
      <div
        style={{
          display: "inline-block",
          background: c.badge,
          color: c.badgeText,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 4,
          marginBottom: 5,
        }}
      >
        {data.sublabel}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1.35 }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: c.border, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { clinical: ClinicalNode };

// ─── Build RF nodes/edges ──────────────────────────────────────────────────────
function buildGraph() {
  const rfNodes = RAW_NODES.map((n) => ({
    id: n.id,
    type: "clinical",
    data: { label: n.label, sublabel: n.sublabel, detail: n.detail, category: n.category },
    position: { x: 0, y: 0 },
  }));

  const rfEdges = RAW_EDGES.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#94A3B8", strokeWidth: 1.5 },
    markerEnd: { type: "arrowclosed", color: "#94A3B8" },
  }));

  return getLayoutedElements(rfNodes, rfEdges);
}

/** Build graph from JSON tree data (cervical_cancer_tree_complete.json) */
function buildGraphFromTree(treeData) {
  if (!treeData?.nodes?.length) return buildGraph();
  const rfNodes = treeData.nodes.map((n) => ({
    id: n.id,
    type: "clinical",
    data: {
      label: n.data?.label ?? n.id,
      sublabel: n.data?.sublabel ?? "",
      detail: n.data?.detail ?? "",
      category: n.category || "treatment",
      attribute_text: n.data?.attribute_text ?? "",
    },
    position: { x: 0, y: 0 },
  }));
  const rfEdges = (treeData.edges || []).map((e, i) => ({
    id: e.id || `e${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#94A3B8", strokeWidth: 1.5 },
    markerEnd: { type: "arrowclosed", color: "#94A3B8" },
  }));
  return getLayoutedElements(rfNodes, rfEdges);
}

const { nodes: INIT_NODES, edges: INIT_EDGES } = buildGraph();

// ─── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ node, onClose }) {
  if (!node) return null;
  const c = CATEGORY[node.data.category] || CATEGORY.treatment;
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 300,
        background: "#fff",
        border: `1.5px solid ${c.border}`,
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflow: "hidden",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ background: c.bg, padding: "14px 18px 12px", borderBottom: `1px solid ${c.border}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div
              style={{
                display: "inline-block",
                background: c.badge,
                color: c.badgeText,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "2px 8px",
                borderRadius: 5,
                marginBottom: 6,
              }}
            >
              {node.data.sublabel}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
              {node.data.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: c.text,
              fontSize: 18,
              lineHeight: 1,
              padding: 2,
              opacity: 0.6,
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>
          {node.data.detail}
        </div>
        {node.data.attribute_text != null && node.data.attribute_text !== "" && (
          <div
            style={{
              marginTop: 14,
              padding: "8px 12px",
              background: "#F8FAFC",
              borderRadius: 8,
              fontSize: 11,
              color: "#64748B",
            }}
          >
            <strong>Notes：</strong>
            {node.data.attribute_text}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { key: "entry",     label: "Entry Point" },
    { key: "diagnosis", label: "Diagnosis" },
    { key: "precancer", label: "Precancerous" },
    { key: "early",     label: "Early Disease" },
    { key: "stage",     label: "FIGO Stage" },
    { key: "treatment", label: "Treatment" },
    { key: "advanced",  label: "Locally Advanced" },
    { key: "meta",      label: "Metastatic" },
  ];
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", marginBottom: 8 }}>
        Node Legend
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
        {items.map((item) => {
          const c = CATEGORY[item.key];
          return (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: c.bg,
                  border: `1.5px solid ${c.border}`,
                }}
              />
              <span style={{ fontSize: 11, color: "#374151" }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main app ──────────────────────────────────────────────────────────────────
export default function CervicalCancerTree({ treeData, embedded = false }) {
  const initial = useMemo(
    () => (treeData ? buildGraphFromTree(treeData) : { nodes: INIT_NODES, edges: INIT_EDGES }),
    [treeData]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNode, setSelectedNode] = useState(null);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // highlight selected node edges
  const styledEdges = useMemo(
    () =>
      edges.map((e) => {
        const active =
          selectedNode &&
          (e.source === selectedNode.id || e.target === selectedNode.id);
        return {
          ...e,
          style: {
            stroke: active ? "#6366F1" : "#CBD5E1",
            strokeWidth: active ? 2.5 : 1.5,
          },
          markerEnd: { type: "arrowclosed", color: active ? "#6366F1" : "#CBD5E1" },
          animated: active,
        };
      }),
    [edges, selectedNode]
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: selectedNode?.id === n.id,
      })),
    [nodes, selectedNode]
  );

  return (
    <div
      style={{
        width: "100%",
        height: embedded ? "100%" : "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#F8FAFC",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}
    >
      {/* 画板区域：ReactFlow + 画板外左下角 Legend */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0, duration: 0 }}
            onInit={(rf) => {
              const fit = () => rf.fitView({ padding: 0, duration: 0 });
              fit();
              setTimeout(fit, 50);
              setTimeout(fit, 200);
            }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#E2E8F0" gap={20} size={1} />
            <Controls position="bottom-left" style={{ bottom: 52, left: 16 }} />
            <MiniMap
              position="bottom-right"
              style={{ bottom: 16, right: 16, border: "1px solid #E2E8F0", borderRadius: 8 }}
              nodeColor={(n) => CATEGORY[n.data?.category]?.border || "#94A3B8"}
            />
          </ReactFlow>
        </div>
        {/* Node Legend：画板外左下角，参考图2横向排列 */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "6px 14px",
            background: "rgba(255,255,255,0.95)",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "8px 12px",
            fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          }}
        >
          {[
            { key: "entry", label: "Entry Point" },
            { key: "diagnosis", label: "Diagnosis" },
            { key: "precancer", label: "Precancerous" },
            { key: "early", label: "Early Disease" },
            { key: "stage", label: "FIGO Stage" },
            { key: "treatment", label: "Treatment" },
            { key: "advanced", label: "Locally Advanced" },
            { key: "meta", label: "Metastatic" },
          ].map((item) => {
            const c = CATEGORY[item.key];
            return (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c.bg,
                    border: `1.5px solid ${c.border}`,
                  }}
                />
                <span style={{ fontSize: 11, color: "#374151" }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedNode && (
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
