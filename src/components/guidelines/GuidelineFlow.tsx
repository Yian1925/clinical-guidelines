import ReactFlow from "reactflow";
import "reactflow/dist/style.css";

const nodes = [
  { id: "1", data: { label: "Cardiac assessment" }, position: { x: 250, y: 0 } },
  { id: "2", data: { label: "FEV1, DLCO" }, position: { x: 250, y: 120 } },
  { id: "3", data: { label: "Both > 80%" }, position: { x: 100, y: 240 } },
  { id: "4", data: { label: "Either < 80%" }, position: { x: 400, y: 240 } },
];

const edges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
  { id: "e2-4", source: "2", target: "4" },
];

export default function GuidelineFlow() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
}
