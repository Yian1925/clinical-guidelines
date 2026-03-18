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
 * From root node ids, BFS traverse the graph.
 * - Edges with `when` (selector): never add the target; add the target's children (no duplicate card).
 * - Edges without `when`: add the target as usual.
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
    const traversable = outgoing.filter(
      (e) => !e.when || (selectionState[e.when.selectorId]?.has(e.when.optionId) ?? false)
    );
    for (const e of traversable) {
      if (e.when) {
        const v = e.target;
        const childEdges = outEdges.get(v) ?? [];
        for (const e2 of childEdges) {
          if (!visible.has(e2.target)) {
            visible.add(e2.target);
            queue.push(e2.target);
          }
        }
      } else {
        if (!visible.has(e.target)) {
          visible.add(e.target);
          queue.push(e.target);
        }
      }
    }
  }
  return visible;
}

/**
 * Returns visible nodes and edges. For edges with `when` we emit virtual edges to grandchildren
 * so the selector target is never shown as a card (avoids repeating the selected option as a card).
 */
export function computeVisibleGraph<TNode extends NodeLike>(
  fullNodes: TNode[],
  fullEdges: EdgeWithCondition[],
  selectionState: SelectionState,
  collapsedNodes?: Set<string>
): { nodes: TNode[]; edges: EdgeWithCondition[] } {
  const visibleIds = computeVisibleNodeIds(fullNodes, fullEdges, selectionState, collapsedNodes);
  const nodes = fullNodes.filter((n) => visibleIds.has(n.id));

  const outEdges = new Map<string, EdgeWithCondition[]>();
  for (const e of fullEdges) {
    const list = outEdges.get(e.source) ?? [];
    list.push(e);
    outEdges.set(e.source, list);
  }

  const edges: EdgeWithCondition[] = [];
  for (const e of fullEdges) {
    if (!visibleIds.has(e.source) || collapsedNodes?.has(e.source)) continue;
    const canFollow = !e.when || (selectionState[e.when.selectorId]?.has(e.when.optionId) ?? false);
    if (!canFollow) continue;
    if (e.when) {
      const childEdges = outEdges.get(e.target) ?? [];
      for (const e2 of childEdges) {
        if (visibleIds.has(e2.target)) {
          edges.push({
            ...e2,
            id: `v-${e.source}-${e2.target}`,
            source: e.source,
            target: e2.target,
          });
        }
      }
    } else {
      if (visibleIds.has(e.target)) edges.push(e);
    }
  }
  return { nodes, edges };
}
