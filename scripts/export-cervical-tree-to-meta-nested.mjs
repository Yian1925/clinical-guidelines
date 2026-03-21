/**
 * Export app-format cervical_cancer_tree_complete.json → meta_tree/Cervical Cancer.json
 * (NCCN-style nested: { text, footnotes, children }[]) for version control / re-conversion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/data/guidelines/cervical_cancer_tree_complete.json");
const OUT_TREE = path.join(ROOT, "src/data/guidelines/meta_tree/Cervical Cancer.json");
const OUT_META = path.join(ROOT, "src/data/guidelines/meta_tree/Cervical Cancer_metadata.json");

function nodeText(data) {
  if (!data) return "";
  const parts = [];
  if (data.sublabel) parts.push(String(data.sublabel));
  if (data.label) parts.push(String(data.label));
  if (data.detail) parts.push(String(data.detail));
  return parts.join("\n");
}

function main() {
  const doc = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const tree = doc.tree;
  const nodes = tree.nodes || [];
  const edges = tree.edges || [];

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Set(edges.map((e) => e.target));
  const roots = nodes.map((n) => n.id).filter((id) => !incoming.has(id));
  if (roots.length === 0) {
    console.error("No root nodes found");
    process.exit(1);
  }

  const outAdj = new Map();
  for (const e of edges) {
    const list = outAdj.get(e.source) || [];
    list.push(e.target);
    outAdj.set(e.source, list);
  }

  function build(id) {
    const n = nodesById.get(id);
    const data = n?.data;
    const text = nodeText(data) || id;
    const childIds = outAdj.get(id) || [];
    const attributeText =
      data?.attribute_text != null && String(data.attribute_text).trim() !== ""
        ? String(data.attribute_text).trim()
        : undefined;
    const o = {
      text,
      footnotes: [],
      children: childIds.map((cid) => build(cid)),
    };
    if (attributeText) o.attributeText = attributeText;
    if (n?.category) o.appCategory = n.category;
    return o;
  }

  const nested = roots.map((rid) => build(rid));

  fs.mkdirSync(path.dirname(OUT_TREE), { recursive: true });
  fs.writeFileSync(OUT_TREE, JSON.stringify(nested, null, 2), "utf8");

  const meta = doc.meta || {};
  const sidecar = {
    disease: ["Cervical cancer"],
    keywords: ["cervical cancer", "FIGO", "HPV", "ESMO"],
    summary: meta.description || meta.name || "",
    appMeta: {
      id: meta.id,
      name: meta.name,
      source: meta.source,
      version: meta.version,
      publication_date: meta.publication_date,
      description: meta.description,
    },
  };
  fs.writeFileSync(OUT_META, JSON.stringify(sidecar, null, 2), "utf8");

  console.log("Wrote", path.relative(ROOT, OUT_TREE));
  console.log("Wrote", path.relative(ROOT, OUT_META));
}

main();
