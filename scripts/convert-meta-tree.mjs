/**
 * Convert NCCN-style nested tree JSON ({ text, children, footnotes, attributes, ... })
 * to app tree shape: { meta, tree: { name, nodes, edges } }.
 *
 * Usage:
 *   node scripts/convert-meta-tree.mjs <input.json> <output.json> [idPrefix] [rootSublabel]
 *
 * If <basename>_metadata.json exists next to input, meta.description uses its summary (when present).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function categoryForDepth(depth) {
  if (depth === 0) return "guideline";
  if (depth === 1) return "diagnosis";
  if (depth === 2) return "early";
  if (depth === 3) return "stage";
  if (depth === 4) return "precancer";
  return "treatment";
}

export function shortLabel(text, max = 100) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  const line = t.split(/(?:\r?\n|•)/)[0].trim() || t;
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function sublabelFromNode(node, depth, rootSublabel) {
  const parts = [];
  if (Array.isArray(node.attributes) && node.attributes.length)
    parts.push(node.attributes.join(", "));
  if (node.page_num != null) parts.push(`p.${node.page_num}`);
  if (parts.length) return parts.join(" · ");
  if (depth === 0) return rootSublabel;
  return `NCCN pathway · depth ${depth}`;
}

function notesFromNode(node) {
  const bits = [];
  if (Array.isArray(node.attributes) && node.attributes.length)
    bits.push(`Refs: ${node.attributes.join(", ")}`);
  if (Array.isArray(node.footnotes) && node.footnotes.length)
    bits.push(`Footnotes: ${node.footnotes.join(", ")}`);
  if (Array.isArray(node["cross-reference"]) && node["cross-reference"].length)
    bits.push(`Cross-ref: ${node["cross-reference"].join(", ")}`);
  return bits.length ? bits.join(" | ") : "";
}

function loadSidecarMeta(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, ".json");
  const side = path.join(dir, `${base}_metadata.json`);
  if (!fs.existsSync(side)) return null;
  try {
    return JSON.parse(fs.readFileSync(side, "utf8"));
  } catch {
    return null;
  }
}

/**
 * @param {unknown[]} roots - NCCN-style root objects
 * @param {{ idPrefix?: string; rootSublabel?: string; edgeCounterStart?: number }} options
 */
export function convertNestedRootsToGraph(roots, options = {}) {
  const idPrefix = options.idPrefix ?? "NODE";
  const rootSublabel = options.rootSublabel ?? "NCCN pathway";
  let idCounter = 0;
  let edgeCounter = options.edgeCounterStart ?? 0;

  const nodes = [];
  const edges = [];

  function visit(n, depth, parentId) {
    const id = `${idPrefix}_${idCounter++}`;
    const text = typeof n.text === "string" ? n.text : "";
    const label = shortLabel(text, 120);
    const detail = text.trim() || label;
    const attrFromNccn = notesFromNode(n);
    const attrExtra = typeof n.attributeText === "string" ? n.attributeText.trim() : "";
    const attrText = [attrFromNccn, attrExtra].filter(Boolean).join(" | ");

    const category =
      typeof n.appCategory === "string" && n.appCategory.trim() !== ""
        ? n.appCategory.trim()
        : categoryForDepth(depth);

    nodes.push({
      id,
      type: "custom",
      category,
      data: {
        id,
        label,
        sublabel: sublabelFromNode(n, depth, rootSublabel),
        content: label,
        detail,
        attribute_text: attrText,
      },
    });

    if (parentId != null) {
      edges.push({
        id: `e${edgeCounter++}`,
        type: "smoothstep",
        source: parentId,
        target: id,
        markerEnd: { type: "arrowclosed" },
      });
    }

    const children = Array.isArray(n.children) ? n.children : [];
    for (const c of children) visit(c, depth + 1, id);
  }

  for (const r of roots) visit(r, 0, null);
  return { nodes, edges, nextEdgeCounter: edgeCounter };
}

export function getGraphRootsAndLeaves(nodes, edges) {
  const targets = new Set(edges.map((e) => e.target));
  const sources = new Set(edges.map((e) => e.source));
  const rootIds = nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
  const leafIds = nodes.filter((n) => !sources.has(n.id)).map((n) => n.id);
  return { rootIds, leafIds };
}

export function convertMetaTree(inputPath, outputPath, options = {}) {
  const treeName = options.treeName ?? "Clinical pathway";
  const metaOverride = options.meta ?? null;

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const roots = Array.isArray(raw) ? raw : [raw];

  const { nodes, edges } = convertNestedRootsToGraph(roots, options);

  const rootText = roots[0]?.text || treeName;
  const sidecar = loadSidecarMeta(inputPath);
  const descriptionFromSidecar =
    sidecar && typeof sidecar.summary === "string" ? sidecar.summary.trim() : "";

  const meta = metaOverride ?? {
    id: `${idPrefix.toLowerCase()}-nccn-converted`,
    name: shortLabel(rootText, 120),
    source: "NCCN",
    version: "converted",
    publication_date: "",
    description: descriptionFromSidecar || shortLabel(rootText, 300),
  };

  const out = {
    meta,
    tree: {
      name: treeName,
      nodes,
      edges,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), "utf8");
  return { nodes: nodes.length, edges: edges.length, outputPath };
}

function main() {
  const [, , inputRel, outputRel, idPrefix, rootSublabel] = process.argv;
  if (!inputRel || !outputRel) {
    console.error(
      "Usage: node scripts/convert-meta-tree.mjs <input.json> <output.json> [idPrefix] [rootSublabel]"
    );
    process.exit(1);
  }
  const ROOT = path.join(__dirname, "..");
  const inputPath = path.isAbsolute(inputRel) ? inputRel : path.join(ROOT, inputRel);
  const outputPath = path.isAbsolute(outputRel) ? outputRel : path.join(ROOT, outputRel);
  if (!fs.existsSync(inputPath)) {
    console.error("Input not found:", inputPath);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const roots = Array.isArray(raw) ? raw : [raw];
  const treeName = shortLabel(roots[0]?.text || "Clinical pathway", 100);
  const r = convertMetaTree(inputPath, outputPath, {
    idPrefix: idPrefix || "NODE",
    rootSublabel: rootSublabel || "NCCN pathway",
    treeName,
  });
  console.log("Wrote", r.outputPath, "nodes", r.nodes, "edges", r.edges);
}

if (process.argv[1]?.endsWith("convert-meta-tree.mjs")) {
  main();
}
