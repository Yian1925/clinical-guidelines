/**
 * Convert cervical NCCN trees under src/data/guidelines/meta_tree/ to
 * src/data/guidelines/cervical_cancer_tree_complete.json.
 *
 * Multiple JSON files are treated as sequential disease phases (one timeline),
 * not parallel roots: each file becomes one segment; segments are linked by
 * synthetic "phase" nodes (previous segment leaves → phase → next segment roots).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertMetaTree,
  convertNestedRootsToGraph,
  getGraphRootsAndLeaves,
  shortLabel,
} from "./convert-meta-tree.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const META_DIR = path.join(ROOT, "src/data/guidelines/meta_tree");
const OUT = path.join(ROOT, "src/data/guidelines/cervical_cancer_tree_complete.json");

const SINGLE_NAME_CANDIDATES = [
  "Cervical Cancer.json",
  "Cervical cancer.json",
  "Cervix Cancer.json",
  "宫颈癌.json",
  "Cervical.json",
];

const CERVICAL_FILE_HINT =
  /(cervical|cervix|宫颈|workup and staging|stage ia|stage ib|stage iia|stage iib|stage iii|stage iva|stage ivb|small cell neuroendocrine carcinoma of the cervix)/i;
const BREAST_FILE_HINT =
  /(breast|ductal|paget|inflammatory|metastatic \(m1\) invasive)/i;

function listJsons(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.includes("_metadata") && !f.startsWith("."))
    .map((f) => path.join(dir, f));
}

function loadMetaOverride() {
  const workupSide = path.join(META_DIR, "Workup and Staging_metadata.json");
  if (fs.existsSync(workupSide)) {
    try {
      const sc = JSON.parse(fs.readFileSync(workupSide, "utf8"));
      const desc = typeof sc.summary === "string" ? sc.summary.trim() : "";
      if (desc) {
        return {
          id: "cervical-nccn-chained",
          name: "Cervical cancer (NCCN clinical pathway)",
          source: "NCCN",
          version: "converted",
          publication_date: "",
          description: desc,
        };
      }
    } catch {
      /* ignore */
    }
  }
  const candidates = [
    "Cervical Cancer_metadata.json",
    "Cervical cancer_metadata.json",
    "宫颈癌_metadata.json",
  ].map((f) => path.join(META_DIR, f));

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const sc = JSON.parse(fs.readFileSync(p, "utf8"));
      if (sc.appMeta && typeof sc.appMeta === "object" && sc.appMeta.name) {
        return {
          id: sc.appMeta.id ?? "cervical-converted",
          name: sc.appMeta.name,
          source: sc.appMeta.source ?? "NCCN",
          version: sc.appMeta.version ?? "converted",
          publication_date: sc.appMeta.publication_date ?? "",
          description: sc.appMeta.description || sc.summary || "",
        };
      }
      if (typeof sc.summary === "string" && sc.summary.trim()) {
        return {
          id: "cervical-converted",
          name: "Cervical cancer clinical pathway",
          source: "NCCN",
          version: "converted",
          publication_date: "",
          description: sc.summary.trim(),
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function parseRootsFromFile(p) {
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return Array.isArray(raw) ? raw : [raw];
}

function rankFile(p) {
  const n = path.basename(p).toLowerCase();
  if (n.includes("workup")) return 0;
  if (n.includes("stage ia1") && n.includes("no lvsi")) return 1;
  if (n.includes("fertility sparing")) return 2;
  if (n.includes("stage ib1") && n.includes("iia1")) return 3;
  if (n.includes("stage ib3") && n.includes("iib")) return 4;
  if (n.includes("stage ivb")) return 5;
  if (n.includes("small cell")) return 6;
  return 50;
}

function selectCervicalFiles() {
  for (const name of SINGLE_NAME_CANDIDATES) {
    const p = path.join(META_DIR, name);
    if (fs.existsSync(p)) return [p];
  }

  const allJsons = listJsons(META_DIR);
  const candidateFiles = allJsons.filter((p) => {
    const base = path.basename(p);
    if (BREAST_FILE_HINT.test(base)) return false;
    if (CERVICAL_FILE_HINT.test(base)) return true;
    try {
      const t = fs.readFileSync(p, "utf8").slice(0, 16000);
      return /cervical|cervix|hpv|pap smear|figo|宫颈|子宫颈|cerv-/i.test(t);
    } catch {
      return false;
    }
  });

  candidateFiles.sort((a, b) => {
    const ra = rankFile(a);
    const rb = rankFile(b);
    return ra - rb || path.basename(a).localeCompare(path.basename(b));
  });

  return candidateFiles;
}

function phaseTitle(filePath) {
  return path.basename(filePath, ".json");
}

function buildChainedGraph(files, metaOverride, rootSublabel) {
  let edgeCounter = 0;
  const allNodes = [];
  const allEdges = [];

  let prevLeafIds = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const roots = parseRootsFromFile(f);
    const idPrefix = `CCX_p${i}`;
    const segRootSublabel = i === 0 ? rootSublabel : `NCCN · ${shortLabel(phaseTitle(f), 60)}`;

    const { nodes, edges, nextEdgeCounter } = convertNestedRootsToGraph(roots, {
      idPrefix,
      rootSublabel: segRootSublabel,
      edgeCounterStart: edgeCounter,
    });
    edgeCounter = nextEdgeCounter;

    const { rootIds, leafIds } = getGraphRootsAndLeaves(nodes, edges);

    if (i === 0) {
      allNodes.push(...nodes);
      allEdges.push(...edges);
      prevLeafIds = leafIds;
      continue;
    }

    const phaseId = `CCX_PHASE_${i}`;
    const title = phaseTitle(f);
    allNodes.push({
      id: phaseId,
      type: "custom",
      category: "diagnosis",
      data: {
        id: phaseId,
        label: shortLabel(title, 120),
        sublabel: "Disease phase (sequential)",
        content: shortLabel(title, 120),
        detail: `Sequential guideline section (not a parallel branch).\n\nSource file: ${title}.json`,
        attribute_text: "",
      },
    });

    if (prevLeafIds.length === 0) {
      console.warn("[convert-cervical] previous segment had no leaves; linking phase to first root only");
    } else {
      for (const lid of prevLeafIds) {
        allEdges.push({
          id: `e${edgeCounter++}`,
          type: "smoothstep",
          source: lid,
          target: phaseId,
          markerEnd: { type: "arrowclosed" },
        });
      }
    }

    for (const rid of rootIds) {
      allEdges.push({
        id: `e${edgeCounter++}`,
        type: "smoothstep",
        source: phaseId,
        target: rid,
        markerEnd: { type: "arrowclosed" },
      });
    }

    allNodes.push(...nodes);
    allEdges.push(...edges);
    prevLeafIds = leafIds;
  }

  const treeName = "Cervical cancer — Clinical pathway (sequential phases)";
  const meta =
    metaOverride ?? {
      id: "cervical-nccn-chained",
      name: "Cervical cancer (NCCN)",
      source: "NCCN",
      version: "converted",
      publication_date: "",
      description: "Chained NCCN cervical cancer sections in clinical order.",
    };

  return {
    meta,
    tree: {
      name: treeName,
      nodes: allNodes,
      edges: allEdges,
    },
  };
}

const files = selectCervicalFiles();
if (files.length === 0) {
  console.error(
    "[convert-cervical] 未在 meta_tree 中找到宫颈癌源 JSON。\n" +
      "请将宫颈癌树文件放入 src/data/guidelines/meta_tree/。"
  );
  process.exit(1);
}

console.log(
  "[convert-cervical] 源文件（按时期串联）:",
  files.map((p) => path.relative(ROOT, p)).join("\n  → ")
);

const metaOverride = loadMetaOverride();
const rootSublabel =
  metaOverride?.source === "ESMO"
    ? "ESMO · Cervical cancer"
    : "NCCN · Cervical cancer";

if (files.length === 1) {
  const r = convertMetaTree(files[0], OUT, {
    idPrefix: "CCX",
    rootSublabel,
    treeName: "Cervical cancer — Clinical pathway",
    meta: metaOverride,
  });
  console.log("Wrote", path.relative(ROOT, r.outputPath), "nodes", r.nodes, "edges", r.edges);
} else {
  const doc = buildChainedGraph(files, metaOverride, rootSublabel);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2), "utf8");
  console.log(
    "Wrote",
    path.relative(ROOT, OUT),
    "nodes",
    doc.tree.nodes.length,
    "edges",
    doc.tree.edges.length
  );
}
