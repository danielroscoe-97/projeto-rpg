import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

export const MIND_MAP_NODE_WIDTH = 180;
export const MIND_MAP_NODE_HEIGHT = 70;

/**
 * Applies Dagre hierarchical layout to mind map nodes.
 * Saved positions (from DM layout) take priority over computed positions.
 */
export function applyMindMapLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  savedPositions?: Map<string, { x: number; y: number }>
): Node<T>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    g.setNode(node.id, { width: MIND_MAP_NODE_WIDTH, height: MIND_MAP_NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const saved = savedPositions?.get(node.id);
    if (saved) {
      return { ...node, position: { x: saved.x, y: saved.y } };
    }
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - MIND_MAP_NODE_WIDTH / 2,
        y: pos.y - MIND_MAP_NODE_HEIGHT / 2,
      },
    };
  });
}

/**
 * Convert node ID to storage key format.
 * 'npc-<uuid>' → 'npc:<uuid>', 'campaign' → 'campaign'
 */
export function nodeIdToKey(nodeId: string): string {
  const idx = nodeId.indexOf("-");
  if (idx === -1) return nodeId;
  return nodeId.substring(0, idx) + ":" + nodeId.substring(idx + 1);
}

/**
 * Convert storage key to node ID format.
 * 'npc:<uuid>' → 'npc-<uuid>', 'campaign' → 'campaign'
 */
export function nodeKeyToId(nodeKey: string): string {
  return nodeKey.replace(":", "-");
}
