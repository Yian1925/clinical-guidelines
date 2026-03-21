/**
 * Convert src/data/guidelines/Invasive Breast Cancer.json → early_breast_cancer_tree_complete.json
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertMetaTree } from "./convert-meta-tree.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/data/guidelines/Invasive Breast Cancer.json");
const OUT = path.join(ROOT, "src/data/guidelines/early_breast_cancer_tree_complete.json");

const r = convertMetaTree(SRC, OUT, {
  idPrefix: "IBC",
  rootSublabel: "NCCN · Invasive breast cancer",
  treeName: "Invasive Breast Cancer — Clinical pathway",
  meta: {
    id: "invasive-breast-nccn-converted",
    name: "Invasive Breast Cancer (NCCN-style pathway)",
    source: "NCCN",
    version: "converted",
    publication_date: "",
    description:
      "Localized breast cancer: invasive, non-inflammatory, non-metastatic (M0) — converted from meta_tree.",
  },
});
console.log("Wrote", OUT);
console.log("nodes", r.nodes, "edges", r.edges);
