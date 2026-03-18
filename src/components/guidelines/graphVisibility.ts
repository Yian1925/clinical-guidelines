/**
 * Compute visible subgraph from full graph and selector selection state.
 * Edges may have optional `when: { selectorId: string; optionId: string }`.
 * Only edges whose `when` is satisfied (optionId selected for selectorId) are traversed
 * from selector nodes; edges without `when` are always traversed.
 */

export type SelectionState = Record<string, Set<string>>;

export interface EdgeWithCondition {
  id: string;
  source: string;
  target: string;
  when?: { selectorId: string; optionId: string };
}

export interface NodeLike {
  id: string;
  [key: string]: unknown;
}

function getRootIds(nodes: NodeLike[], edges: EdgeWithCondition[]): string[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes.map((n) => n.id).filter((id) => !hasIncoming.has(id));
}

/**
 * From root node ids, BFS traverse the graph. When leaving a node, follow an edge only if:
 * - the node is not in collapsedNodes (if provided),
 * - the edge has no `when`, or the edge has `when` and selectionState[when.selectorId] contains when.optionId.
 */
export function computeVisibleNodeIds(
  nodes: NodeLike[],
  edges: EdgeWithCondition[],
  selectionState: SelectionState,
  collapsedNodes?: Set<string>
): Set<string> {
  const outEdges = new Map<string, EdgeWithCondition[]>();
  for (const e of edges) {
    const list = outEdges.get(e.source) ?? [];
    list.push(e);
    outEdges.set(e.source, list);
  }

  const roots = getRootIds(nodes, edges);
  if (roots.length === 0) return new Set();
  const queue = [...roots];
  const visible = new Set<string>(roots);

  while (queue.length > 0) {
    const u = queue.shift()!;
    if (collapsedNodes?.has(u)) continue;
    const outgoing = outEdges.get(u) ?? [];
    for (const e of outgoing) {
      const canFollow = !e.when || (selectionState[e.when.selectorId]?.has(e.when.optionId) ?? false);
      if (!canFollow) continue;
      if (!visible.has(e.target)) {
        visible.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return visible;
}

/**
 * Returns visible nodes and edges: nodes that are reachable under selectionState and collapsedNodes,
 * and edges that are traversable and whose source is reachable and not collapsed.
 */
export function computeVisibleGraph<TNode extends NodeLike>(
  fullNodes: TNode[],
  fullEdges: EdgeWithCondition[],
  selectionState: SelectionState,
  collapsedNodes?: Set<string>
): { nodes: TNode[]; edges: EdgeWithCondition[] } {
  const visibleIds = computeVisibleNodeIds(fullNodes, fullEdges, selectionState, collapsedNodes);
  const nodes = fullNodes.filter((n) => visibleIds.has(n.id));
  const edges = fullEdges.filter((e) => {
    if (!visibleIds.has(e.source)) return false;
    if (collapsedNodes?.has(e.source)) return false;
    if (!e.when) return true;
    return selectionState[e.when.selectorId]?.has(e.when.optionId) ?? false;
  });
  return { nodes, edges };
}
