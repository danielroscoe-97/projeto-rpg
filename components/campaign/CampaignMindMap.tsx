"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  type NodeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { Maximize2, Minimize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nodeIdToKey } from "@/lib/utils/mind-map-layout";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";
import type { CampaignNote } from "@/lib/types/database";
import type {
  NoteType,
  MindMapEdge,
  EdgeRelationship,
  CampaignLocation,
  CampaignFaction,
} from "@/lib/types/mind-map";

const RELATIONSHIP_OPTIONS: Array<{ value: EdgeRelationship; label: string }> = [
  { value: "linked_to", label: "linked_to" },
  { value: "lives_in", label: "lives_in" },
  { value: "participated_in", label: "participated_in" },
  { value: "requires", label: "requires" },
  { value: "leads_to", label: "leads_to" },
  { value: "allied_with", label: "allied_with" },
  { value: "enemy_of", label: "enemy_of" },
  { value: "gave_quest", label: "gave_quest" },
  { value: "member_of", label: "member_of" },
  { value: "happened_at", label: "happened_at" },
  { value: "guards", label: "guards" },
  { value: "owns", label: "owns" },
];

import { CampaignNode, type CampaignNodeData } from "./nodes/CampaignNode";
import { NpcNode, type NpcNodeData } from "./nodes/NpcNode";
import { NoteNode, type NoteNodeData } from "./nodes/NoteNode";
import { PlayerNode, type PlayerNodeData } from "./nodes/PlayerNode";
import { SessionNode, type SessionNodeData } from "./nodes/SessionNode";
import { QuestNode, type QuestNodeData } from "./nodes/QuestNode";
import { BagNode, type BagNodeData } from "./nodes/BagNode";
import { LocationNode, type LocationNodeData } from "./nodes/LocationNode";
import { FactionNode, type FactionNodeData } from "./nodes/FactionNode";
import { GroupNode, type GroupNodeData } from "./nodes/GroupNode";

/* ---------- Types ---------- */

interface NoteNpcLink {
  note_id: string;
  npc_id: string;
}

type MindMapNodeData =
  | CampaignNodeData
  | NpcNodeData
  | NoteNodeData
  | PlayerNodeData
  | SessionNodeData
  | QuestNodeData
  | BagNodeData
  | LocationNodeData
  | FactionNodeData
  | GroupNodeData;

type MindMapNode = Node<MindMapNodeData>;

type NodeFilter = "npc" | "note" | "player" | "session" | "quest" | "bag" | "location" | "faction";

type LayoutMode = "hierarchical" | "force" | "radial";

interface ContextMenuState {
  x: number;
  y: number;
  type: "node" | "edge";
  nodeId?: string;
  nodeType?: string;
  nodeLabel?: string;
  edgeId?: string;
  edgeDbId?: string;
  edgeRelationship?: EdgeRelationship;
}

/* ---------- Node types map ---------- */

const nodeTypes: NodeTypes = {
  campaign: CampaignNode,
  npc: NpcNode,
  note: NoteNode,
  player: PlayerNode,
  session: SessionNode,
  quest: QuestNode,
  bag: BagNode,
  location: LocationNode,
  faction: FactionNode,
  group: GroupNode,
};

/* ---------- Constants ---------- */

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;

const CAMPAIGN_EDGE_STYLE = { stroke: "#d4a44a", strokeWidth: 1.5, opacity: 0.6 };
const CROSSLINK_EDGE_STYLE = { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 };

const EDGE_COLORS: Record<string, string> = {
  linked_to: "#a78bfa",
  lives_in: "#22d3ee",
  participated_in: "#ef4444",
  requires: "#eab308",
  leads_to: "#eab308",
  allied_with: "#34d399",
  enemy_of: "#ef4444",
  gave_quest: "#eab308",
  dropped_item: "#f97316",
  member_of: "#fb7185",
  happened_at: "#22d3ee",
  guards: "#a78bfa",
  owns: "#f97316",
  custom: "#6b7280",
};

const MINIMAP_COLORS: Record<string, string> = {
  campaign: "#f59e0b",
  npc: "#a78bfa",
  note: "#60a5fa",
  player: "#34d399",
  session: "#ef4444",
  quest: "#eab308",
  bag: "#f97316",
  location: "#22d3ee",
  faction: "#fb7185",
  group: "#6b7280",
};

const FILTER_CONFIG: Array<{ key: NodeFilter; color: string; activeColor: string }> = [
  { key: "npc", color: "border-purple-400/20 text-purple-400/50 line-through", activeColor: "border-purple-400 bg-purple-400/20 text-purple-300" },
  { key: "note", color: "border-blue-400/20 text-blue-400/50 line-through", activeColor: "border-blue-400 bg-blue-400/20 text-blue-300" },
  { key: "player", color: "border-emerald-400/20 text-emerald-400/50 line-through", activeColor: "border-emerald-400 bg-emerald-400/20 text-emerald-300" },
  { key: "session", color: "border-red-400/20 text-red-400/50 line-through", activeColor: "border-red-400 bg-red-400/20 text-red-300" },
  { key: "quest", color: "border-yellow-400/20 text-yellow-400/50 line-through", activeColor: "border-yellow-400 bg-yellow-400/20 text-yellow-300" },
  { key: "bag", color: "border-orange-400/20 text-orange-400/50 line-through", activeColor: "border-orange-400 bg-orange-400/20 text-orange-300" },
  { key: "location", color: "border-cyan-400/20 text-cyan-400/50 line-through", activeColor: "border-cyan-400 bg-cyan-400/20 text-cyan-300" },
  { key: "faction", color: "border-rose-400/20 text-rose-400/50 line-through", activeColor: "border-rose-400 bg-rose-400/20 text-rose-300" },
];

const LAYOUT_MODES: LayoutMode[] = ["hierarchical", "force", "radial"];

const TOOLTIP_DELAY_MS = 300;

/* ---------- Dagre layout ---------- */

function applyDagreLayout(
  nodes: MindMapNode[],
  edges: Edge[],
  savedPositions?: Map<string, { x: number; y: number }>
): MindMapNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
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
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

/* ---------- Force-directed layout ---------- */

function applyForceLayout(nodes: MindMapNode[], edges: Edge[]): MindMapNode[] {
  if (nodes.length === 0) return nodes;

  const positions = new Map<string, { x: number; y: number }>();
  const r = Math.max(200, nodes.length * 25);
  nodes.forEach((n, i) => {
    if (n.id === "campaign") {
      positions.set(n.id, { x: 0, y: 0 });
    } else {
      const angle = (i / nodes.length) * 2 * Math.PI;
      positions.set(n.id, { x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
  });

  const edgePairs = edges.map((e) => ({ s: e.source, t: e.target }));
  const REPULSION = 6000;
  const ATTRACTION = 0.008;
  const DAMPING = 0.85;
  const ITERATIONS = nodes.length > 60 ? 25 : nodes.length > 30 ? 45 : 80;
  const CONVERGENCE_THRESHOLD = 0.5;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    let maxDelta = 0;

    for (const n1 of nodes) {
      if (n1.id === "campaign") continue;
      const p1 = positions.get(n1.id)!;
      let fx = 0;
      let fy = 0;

      for (const n2 of nodes) {
        if (n1.id === n2.id) continue;
        const p2 = positions.get(n2.id)!;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      for (const ep of edgePairs) {
        let other: string | null = null;
        if (ep.s === n1.id) other = ep.t;
        else if (ep.t === n1.id) other = ep.s;
        if (!other) continue;
        const p2 = positions.get(other);
        if (!p2) continue;
        fx += (p2.x - p1.x) * ATTRACTION;
        fy += (p2.y - p1.y) * ATTRACTION;
      }

      const dx = fx * DAMPING;
      const dy = fy * DAMPING;
      p1.x += dx;
      p1.y += dy;
      maxDelta = Math.max(maxDelta, Math.abs(dx) + Math.abs(dy));
    }

    // Early exit when layout has converged
    if (maxDelta < CONVERGENCE_THRESHOLD) break;
  }

  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id) ?? { x: 0, y: 0 },
  }));
}

/* ---------- Radial layout ---------- */

function applyRadialLayout(nodes: MindMapNode[], _edges: Edge[]): MindMapNode[] {
  if (nodes.length === 0) return nodes;

  const typeOrder: string[] = [
    "session", "quest", "npc", "note", "player", "location", "faction", "bag", "group",
  ];
  const nodesByType = new Map<string, MindMapNode[]>();

  for (const node of nodes) {
    const type = node.type ?? "unknown";
    if (type === "campaign") continue;
    if (!nodesByType.has(type)) nodesByType.set(type, []);
    nodesByType.get(type)!.push(node);
  }

  const positions = new Map<string, { x: number; y: number }>();
  positions.set("campaign", { x: 0, y: 0 });

  let ringIndex = 0;
  for (const type of typeOrder) {
    const typeNodes = nodesByType.get(type);
    if (!typeNodes || typeNodes.length === 0) continue;
    ringIndex++;
    const radius = ringIndex * 220;
    typeNodes.forEach((n, i) => {
      const angle = (i / typeNodes.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(n.id, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });
  }

  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id) ?? { x: 0, y: 0 },
  }));
}

/* ---------- Component ---------- */

interface CampaignMindMapProps {
  campaignId: string;
  campaignName: string;
}

export function CampaignMindMap({ campaignId, campaignName }: CampaignMindMapProps) {
  const t = useTranslations("mindmap");
  const tNotes = useTranslations("notes");
  const tLocations = useTranslations("locations");
  const tFactions = useTranslations("factions");

  /* ---- Core state ---- */
  const [allNodes, setAllNodes] = useState<MindMapNode[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<NodeFilter, boolean>>({
    npc: true,
    note: true,
    player: true,
    session: true,
    quest: true,
    bag: true,
    location: true,
    faction: true,
  });
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Layout mode ---- */
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("hierarchical");
  const [fullscreen, setFullscreen] = useState(false);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [fullscreen]);

  /* ---- Collapsible groups ---- */
  const [collapsedGroups, setCollapsedGroups] = useState<Set<NodeFilter>>(new Set());

  /* ---- Tooltip state ---- */
  const [hoveredNode, setHoveredNode] = useState<MindMapNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Context menu ---- */
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  /* ---- Connecting mode ---- */
  const [connectingFromNode, setConnectingFromNode] = useState<string | null>(null);

  /* ---- Drag-to-connect ---- */
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<EdgeRelationship>("linked_to");
  const [editingEdge, setEditingEdge] = useState<{
    edgeId: string;
    dbId: string;
  } | null>(null);

  /* ---- Realtime debounce ---- */
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Toggle filter ---- */
  const toggleFilter = useCallback((key: NodeFilter) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ---- Toggle group collapse ---- */
  const toggleGroup = useCallback(
    (key: NodeFilter) => {
      setCollapsedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);

        const isCollapsed = next.has(key);
        const supabase = createClient();
        supabase
          .from("campaign_mind_map_layout")
          .upsert(
            { campaign_id: campaignId, node_key: `group:${key}`, x: 0, y: 0, is_collapsed: isCollapsed },
            { onConflict: "campaign_id,node_key" }
          )
          .then(({ error }) => {
            if (error) console.warn("[MindMap] Collapse save failed:", error.message);
          });

        return next;
      });
    },
    [campaignId]
  );

  /* ---- Save layout (debounced) ---- */
  const saveLayout = useCallback(
    (nodeId: string, x: number, y: number) => {
      savedPositionsRef.current.set(nodeId, { x, y });

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const supabase = createClient();
        const entries = Array.from(savedPositionsRef.current.entries()).map(
          ([id, pos]) => ({
            campaign_id: campaignId,
            node_key: nodeIdToKey(id),
            x: pos.x,
            y: pos.y,
          })
        );

        const { error } = await supabase
          .from("campaign_mind_map_layout")
          .upsert(entries, { onConflict: "campaign_id,node_key" });

        if (error) {
          console.warn("[MindMap] Layout save failed:", error.message);
        }
      }, 1000);
    },
    [campaignId]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, []);

  /* ---- Handle node drag end ---- */
  const handleNodesChange = useCallback(
    (changes: NodeChange<MindMapNode>[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          saveLayout(change.id, change.position.x, change.position.y);
        }
      }
    },
    [onNodesChange, saveLayout]
  );

  /* ---- Tooltip handlers ---- */
  const handleNodeMouseEnter: NodeMouseHandler<MindMapNode> = useCallback((_event, node) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const x = _event.clientX;
    const y = _event.clientY;
    hoverTimerRef.current = setTimeout(() => {
      setHoveredNode(node);
      setTooltipPos({ x, y });
    }, TOOLTIP_DELAY_MS);
  }, []);

  const handleNodeMouseLeave: NodeMouseHandler<MindMapNode> = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredNode(null);
    setTooltipPos(null);
  }, []);

  /* ---- Context menu handlers ---- */
  const handleNodeContextMenu: NodeMouseHandler<MindMapNode> = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: "node",
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: (node.data as { label?: string }).label ?? "",
    });
  }, []);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    if (!edge.id.startsWith("edge-")) return;
    const dbId = edge.id.replace("edge-", "");
    const relationship = (edge.label as string)?.replace(/ /g, "_") as EdgeRelationship | undefined;
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: "edge",
      edgeId: edge.id,
      edgeDbId: dbId,
      edgeRelationship: relationship,
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /* ---- Context menu actions ---- */
  const handleViewDetails = useCallback(() => {
    if (!contextMenu?.nodeType) return;
    const sectionMap: Record<string, string> = {
      npc: "section_npcs",
      note: "section_notes",
      player: "section_players",
      session: "section_encounters",
      quest: "section_quests",
      location: "section_locations",
      faction: "section_factions",
    };
    const sectionId = sectionMap[contextMenu.nodeType];
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleConnectTo = useCallback(() => {
    if (contextMenu?.nodeId) setConnectingFromNode(contextMenu.nodeId);
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleCollapseGroup = useCallback(() => {
    if (contextMenu?.nodeType) toggleGroup(contextMenu.nodeType as NodeFilter);
    closeContextMenu();
  }, [contextMenu, toggleGroup, closeContextMenu]);

  const handleRemoveConnection = useCallback(async () => {
    if (!contextMenu?.edgeDbId || !contextMenu?.edgeId) return;
    const capturedMenu = contextMenu;
    closeContextMenu();
    const supabase = createClient();
    await supabase.from("campaign_mind_map_edges").delete().eq("id", capturedMenu.edgeDbId);
    setAllEdges((prev) => prev.filter((e) => e.id !== capturedMenu.edgeId));
  }, [contextMenu, closeContextMenu]);

  const handleChangeRelationship = useCallback(() => {
    if (!contextMenu?.edgeId || !contextMenu?.edgeDbId) return;
    setEditingEdge({ edgeId: contextMenu.edgeId, dbId: contextMenu.edgeDbId });
    setSelectedRelationship(contextMenu.edgeRelationship ?? "linked_to");
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  /* ---- Pane click ---- */
  const handlePaneClick = useCallback(() => {
    closeContextMenu();
    setConnectingFromNode(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredNode(null);
    setTooltipPos(null);
  }, [closeContextMenu]);

  /* ---- ESC handler (layered dismissal) ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Dismiss topmost overlay first, then fullscreen last
        if (contextMenu) {
          setContextMenu(null);
        } else if (connectingFromNode) {
          setConnectingFromNode(null);
        } else {
          setFullscreen(false); // idempotent — safe even if not fullscreen
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [contextMenu, connectingFromNode]);

  /* ---- Apply filters + collapsed groups + layout ---- */
  useEffect(() => {
    const visibleNodeIds = new Set<string>();

    const typeCounts = new Map<NodeFilter, number>();
    for (const node of allNodes) {
      if (node.type && node.type !== "campaign") {
        typeCounts.set(
          node.type as NodeFilter,
          (typeCounts.get(node.type as NodeFilter) ?? 0) + 1
        );
      }
    }

    const filteredNodes: MindMapNode[] = [];

    for (const node of allNodes) {
      if (node.type === "campaign") {
        visibleNodeIds.add(node.id);
        filteredNodes.push(node);
        continue;
      }

      const nodeType = node.type as NodeFilter;
      if (filters[nodeType] === false) continue;
      if (collapsedGroups.has(nodeType)) continue;

      visibleNodeIds.add(node.id);
      filteredNodes.push(node);
    }

    // Add group nodes for collapsed types
    for (const groupType of collapsedGroups) {
      if (filters[groupType] === false) continue;
      const count = typeCounts.get(groupType) ?? 0;
      if (count === 0) continue;

      const groupNodeId = `group-${groupType}`;
      visibleNodeIds.add(groupNodeId);
      filteredNodes.push({
        id: groupNodeId,
        type: "group",
        position: { x: 0, y: 0 },
        data: { label: t(`filter_${groupType}`), count, groupType },
        draggable: true,
      });
    }

    // Build edges: redirect to group nodes when collapsed
    const filteredEdges: Edge[] = [];
    const addedGroupEdges = new Set<string>();

    for (const edge of allEdges) {
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);

      if (sourceVisible && targetVisible) {
        filteredEdges.push(edge);
        continue;
      }

      if (sourceVisible && !targetVisible) {
        const targetType = edge.target.split("-")[0] as NodeFilter;
        if (collapsedGroups.has(targetType)) {
          const groupNodeId = `group-${targetType}`;
          const groupEdgeId = `${edge.source}-${groupNodeId}`;
          if (!addedGroupEdges.has(groupEdgeId) && visibleNodeIds.has(groupNodeId)) {
            addedGroupEdges.add(groupEdgeId);
            filteredEdges.push({
              id: groupEdgeId,
              source: edge.source,
              target: groupNodeId,
              style: CAMPAIGN_EDGE_STYLE,
            });
          }
        }
      }
    }

    let laidOut: MindMapNode[];
    if (filteredNodes.length === 0) {
      laidOut = [];
    } else if (layoutMode === "force") {
      laidOut = applyForceLayout(filteredNodes, filteredEdges);
    } else if (layoutMode === "radial") {
      laidOut = applyRadialLayout(filteredNodes, filteredEdges);
    } else {
      laidOut = applyDagreLayout(filteredNodes, filteredEdges, savedPositionsRef.current);
    }

    setNodes(laidOut);
    setEdges(filteredEdges);
  }, [allNodes, allEdges, filters, collapsedGroups, layoutMode, setNodes, setEdges, t]);

  /* ---- Data loading ---- */
  const loadData = useCallback(
    async (isInitial = false) => {
      const supabase = createClient();

      const [
        npcsRes,
        notesRes,
        membersRes,
        linksRes,
        sessionsRes,
        questsRes,
        bagRes,
        locationsRes,
        factionsRes,
        edgesRes,
        layoutRes,
      ] = await Promise.all([
        supabase
          .from("campaign_npcs")
          .select("id, name, stats, avatar_url, is_visible_to_players, is_alive")
          .eq("campaign_id", campaignId)
          .order("name"),
        supabase
          .from("campaign_notes")
          .select("id, title, is_shared, note_type")
          .eq("campaign_id", campaignId)
          .order("title"),
        supabase
          .from("campaign_members")
          .select(
            "id, user_id, role, users!campaign_members_user_id_fkey(display_name, email)"
          )
          .eq("campaign_id", campaignId)
          .eq("status", "active"),
        supabase
          .from("note_npc_links")
          .select("note_id, npc_id, campaign_notes!inner(campaign_id)")
          .eq("campaign_notes.campaign_id", campaignId),
        supabase
          .from("sessions")
          .select("id, name, is_active, encounters(id, name)")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_quests")
          .select("id, title, status")
          .eq("campaign_id", campaignId)
          .order("sort_order"),
        supabase
          .from("party_inventory_items")
          .select("id, item_name")
          .eq("campaign_id", campaignId)
          .eq("status", "active"),
        supabase
          .from("campaign_locations")
          .select("id, name, location_type, is_discovered")
          .eq("campaign_id", campaignId)
          .order("sort_order"),
        supabase
          .from("campaign_factions")
          .select("id, name, alignment")
          .eq("campaign_id", campaignId)
          .order("sort_order"),
        supabase
          .from("campaign_mind_map_edges")
          .select("id, source_type, source_id, target_type, target_id, relationship, custom_label")
          .eq("campaign_id", campaignId),
        supabase
          .from("campaign_mind_map_layout")
          .select("node_key, x, y, is_collapsed")
          .eq("campaign_id", campaignId),
      ]);

      const npcs = (npcsRes.data ?? []) as Array<
        Pick<CampaignNpc, "id" | "name" | "stats" | "avatar_url" | "is_visible_to_players"> & {
          is_alive?: boolean;
        }
      >;
      const notes = (notesRes.data ?? []) as Array<
        Pick<CampaignNote, "id" | "title" | "is_shared"> & { note_type?: NoteType }
      >;
      const membersRaw = (membersRes.data ?? []) as unknown as Array<{
        id: string;
        user_id: string;
        role: string;
        users: { display_name: string | null; email: string } | null;
      }>;
      const links = (linksRes.data ?? []) as NoteNpcLink[];
      const sessions = (sessionsRes.data ?? []) as Array<{
        id: string;
        name: string;
        is_active: boolean;
        encounters: Array<{ id: string; name: string }>;
      }>;
      const quests = (questsRes.data ?? []) as Array<{
        id: string;
        title: string;
        status: "available" | "active" | "completed";
      }>;
      const bagItems = (bagRes.data ?? []) as Array<{ id: string; item_name: string }>;
      const locations = (locationsRes.data ?? []) as Array<
        Pick<CampaignLocation, "id" | "name" | "location_type" | "is_discovered">
      >;
      const factions = (factionsRes.data ?? []) as Array<
        Pick<CampaignFaction, "id" | "name" | "alignment">
      >;
      const customEdges = (edgesRes.data ?? []) as MindMapEdge[];
      const layoutData = (layoutRes.data ?? []) as Array<{
        node_key: string;
        x: number;
        y: number;
        is_collapsed?: boolean;
      }>;

      // Build saved positions + collapsed groups from DB
      const posMap = new Map<string, { x: number; y: number }>();
      const initialCollapsed = new Set<NodeFilter>();
      for (const lp of layoutData) {
        if (lp.node_key.startsWith("group:")) {
          const groupType = lp.node_key.replace("group:", "") as NodeFilter;
          if (lp.is_collapsed) initialCollapsed.add(groupType);
        } else {
          const nodeId = lp.node_key.replace(":", "-");
          posMap.set(nodeId, { x: lp.x, y: lp.y });
        }
      }
      savedPositionsRef.current = posMap;

      if (isInitial && initialCollapsed.size > 0) {
        setCollapsedGroups(initialCollapsed);
      }

      // Fetch character names
      const playerUserIds = membersRaw
        .filter((m) => m.role === "player")
        .map((m) => m.user_id);

      const characterMap: Record<string, string> = {};
      if (playerUserIds.length > 0) {
        const { data: characters } = await supabase
          .from("player_characters")
          .select("user_id, name")
          .eq("campaign_id", campaignId)
          .in("user_id", playerUserIds);

        for (const pc of characters ?? []) {
          if (!characterMap[pc.user_id]) {
            characterMap[pc.user_id] = pc.name;
          }
        }
      }

      /* ---- Build nodes ---- */
      const newNodes: MindMapNode[] = [];
      const newEdges: Edge[] = [];

      newNodes.push({
        id: "campaign",
        type: "campaign",
        position: { x: 0, y: 0 },
        data: { label: campaignName },
        draggable: true,
      });

      for (const npc of npcs) {
        const nodeId = `npc-${npc.id}`;
        newNodes.push({
          id: nodeId,
          type: "npc",
          position: { x: 0, y: 0 },
          data: {
            label: npc.name,
            hp: npc.stats?.hp,
            ac: npc.stats?.ac,
            npcId: npc.id,
            isAlive: npc.is_alive ?? true,
            isHidden: !npc.is_visible_to_players,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const note of notes) {
        const nodeId = `note-${note.id}`;
        const nt = note.note_type ?? "general";
        newNodes.push({
          id: nodeId,
          type: "note",
          position: { x: 0, y: 0 },
          data: {
            label: note.title || tNotes("untitled"),
            isShared: note.is_shared,
            noteId: note.id,
            noteType: nt,
            noteTypeLabel: nt !== "general" ? t(`note_type_${nt}`) : undefined,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const member of membersRaw) {
        const nodeId = `player-${member.id}`;
        const displayName =
          member.users?.display_name ?? member.users?.email ?? "Unknown";
        newNodes.push({
          id: nodeId,
          type: "player",
          position: { x: 0, y: 0 },
          data: {
            label: displayName,
            characterName: characterMap[member.user_id] ?? null,
            memberId: member.id,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const session of sessions) {
        const nodeId = `session-${session.id}`;
        newNodes.push({
          id: nodeId,
          type: "session",
          position: { x: 0, y: 0 },
          data: {
            label: session.name,
            isActive: session.is_active,
            sessionId: session.id,
            statusLabel: session.is_active ? t("session_active") : t("session_ended"),
            encounterCount: session.encounters?.length ?? 0,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const session of sessions) {
        for (const enc of session.encounters ?? []) {
          const encNodeId = `session-enc-${enc.id}`;
          newNodes.push({
            id: encNodeId,
            type: "session",
            position: { x: 0, y: 0 },
            data: {
              label: enc.name,
              isActive: false,
              sessionId: session.id,
              statusLabel: t("encounter_label"),
            },
            draggable: true,
          });
          newEdges.push({
            id: `session-${session.id}-enc-${enc.id}`,
            source: `session-${session.id}`,
            target: encNodeId,
            style: { stroke: "#ef4444", strokeWidth: 1, opacity: 0.4 },
          });
        }
      }

      for (const quest of quests) {
        const nodeId = `quest-${quest.id}`;
        newNodes.push({
          id: nodeId,
          type: "quest",
          position: { x: 0, y: 0 },
          data: {
            label: quest.title,
            status: quest.status,
            questId: quest.id,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      if (bagItems.length > 0) {
        const bagNodeId = "bag-holding";
        newNodes.push({
          id: bagNodeId,
          type: "bag",
          position: { x: 0, y: 0 },
          data: {
            label: t("bag_node"),
            itemCount: bagItems.length,
            itemsLabel: bagItems.length === 1 ? t("bag_item") : t("bag_items"),
            itemNames: bagItems.slice(0, 5).map((i) => i.item_name),
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${bagNodeId}`,
          source: "campaign",
          target: bagNodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const loc of locations) {
        const nodeId = `location-${loc.id}`;
        newNodes.push({
          id: nodeId,
          type: "location",
          position: { x: 0, y: 0 },
          data: {
            label: loc.name,
            locationType: loc.location_type,
            locationTypeLabel: tLocations(`type_${loc.location_type}`),
            isDiscovered: loc.is_discovered,
            locationId: loc.id,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      for (const fac of factions) {
        const nodeId = `faction-${fac.id}`;
        newNodes.push({
          id: nodeId,
          type: "faction",
          position: { x: 0, y: 0 },
          data: {
            label: fac.name,
            alignment: fac.alignment,
            alignmentLabel: tFactions(`alignment_${fac.alignment}`),
            factionId: fac.id,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Cross-links: Note <-> NPC (legacy)
      const nodeIdSet = new Set(newNodes.map((n) => n.id));
      for (const link of links) {
        const noteNodeId = `note-${link.note_id}`;
        const npcNodeId = `npc-${link.npc_id}`;
        if (nodeIdSet.has(noteNodeId) && nodeIdSet.has(npcNodeId)) {
          newEdges.push({
            id: `link-${link.note_id}-${link.npc_id}`,
            source: noteNodeId,
            target: npcNodeId,
            style: CROSSLINK_EDGE_STYLE,
            animated: true,
          });
        }
      }

      // Custom edges from campaign_mind_map_edges
      for (const ce of customEdges) {
        const sourceNodeId = `${ce.source_type}-${ce.source_id}`;
        const targetNodeId = `${ce.target_type}-${ce.target_id}`;
        if (nodeIdSet.has(sourceNodeId) && nodeIdSet.has(targetNodeId)) {
          newEdges.push({
            id: `edge-${ce.id}`,
            source: sourceNodeId,
            target: targetNodeId,
            label: ce.custom_label ?? ce.relationship.replace(/_/g, " "),
            style: {
              stroke: EDGE_COLORS[ce.relationship] ?? "#6b7280",
              strokeWidth: 1,
              opacity: 0.5,
            },
            animated: ce.relationship !== "linked_to",
            labelStyle: { fontSize: 9, fill: "#9ca3af" },
          });
        }
      }

      setAllNodes(newNodes);
      setAllEdges(newEdges);
      if (isInitial) setLoading(false);
    },
    [campaignId, campaignName, t, tNotes, tLocations, tFactions]
  );

  /* ---- Create linked note (context menu action) ---- */
  const handleCreateLinkedNote = useCallback(async () => {
    if (!contextMenu?.nodeId) return;
    const capturedMenu = contextMenu;
    closeContextMenu();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const nodeId = capturedMenu.nodeId!;
    const idx = nodeId.indexOf("-");
    const sourceType = idx === -1 ? nodeId : nodeId.substring(0, idx);
    const sourceId = idx === -1 ? nodeId : nodeId.substring(idx + 1);

    const { data: note, error } = await supabase
      .from("campaign_notes")
      .insert({
        campaign_id: campaignId,
        title: `Note — ${capturedMenu.nodeLabel ?? sourceType}`,
        body: "",
        is_shared: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !note) return;

    await supabase.from("campaign_mind_map_edges").insert({
      campaign_id: campaignId,
      source_type: sourceType,
      source_id: sourceId,
      target_type: "note",
      target_id: note.id,
      relationship: "linked_to" as EdgeRelationship,
      created_by: user.id,
    });

    loadData();
  }, [contextMenu, campaignId, closeContextMenu, loadData]);

  /* ---- Initial data fetch ---- */
  useEffect(() => {
    let cancelled = false;
    loadData(true).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  /* ---- Realtime subscription ---- */
  useEffect(() => {
    const supabase = createClient();

    const debouncedRefetch = () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(() => {
        loadData(false);
      }, 2000);
    };

    const tables = [
      "campaign_npcs",
      "campaign_notes",
      "campaign_quests",
      "campaign_locations",
      "campaign_factions",
      "campaign_mind_map_edges",
      "party_inventory_items",
      "sessions",
    ];

    let channel = supabase.channel(`mindmap:${campaignId}`);
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `campaign_id=eq.${campaignId}` } as const,
        debouncedRefetch
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, loadData]);

  /* ---- Node click handler ---- */
  const handleNodeClick: NodeMouseHandler<MindMapNode> = useCallback(
    (_event, node) => {
      if (connectingFromNode) {
        if (node.id !== connectingFromNode) {
          setPendingConnection({
            source: connectingFromNode,
            target: node.id,
            sourceHandle: null,
            targetHandle: null,
          });
          setSelectedRelationship("linked_to");
        }
        setConnectingFromNode(null);
        return;
      }

      if (node.type === "group") {
        const groupData = node.data as GroupNodeData;
        toggleGroup(groupData.groupType as NodeFilter);
        return;
      }

      const sectionMap: Record<string, string> = {
        npc: "section_npcs",
        note: "section_notes",
        player: "section_players",
        session: "section_encounters",
        quest: "section_quests",
        location: "section_locations",
        faction: "section_factions",
      };
      const nodeType = node.type ?? "";
      const sectionId = sectionMap[nodeType];
      if (sectionId) {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [connectingFromNode, toggleGroup]
  );

  /* ---- Minimap color ---- */
  const minimapNodeColor = useCallback(
    (node: MindMapNode) => MINIMAP_COLORS[node.type ?? ""] ?? "#6b7280",
    []
  );

  /* ---- Drag-to-connect ---- */
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      setPendingConnection(connection);
      setSelectedRelationship("linked_to");
    }
  }, []);

  const confirmConnection = useCallback(async () => {
    if (editingEdge) {
      const supabase = createClient();
      const { error } = await supabase
        .from("campaign_mind_map_edges")
        .update({ relationship: selectedRelationship })
        .eq("id", editingEdge.dbId);

      if (!error) {
        setAllEdges((prev) =>
          prev.map((e) => {
            if (e.id !== editingEdge.edgeId) return e;
            return {
              ...e,
              label: selectedRelationship.replace(/_/g, " "),
              style: {
                stroke: EDGE_COLORS[selectedRelationship] ?? "#6b7280",
                strokeWidth: 1,
                opacity: 0.5,
              },
              animated: selectedRelationship !== "linked_to",
            };
          })
        );
      }
      setEditingEdge(null);
      return;
    }

    if (!pendingConnection?.source || !pendingConnection?.target) return;

    const sourceId = pendingConnection.source;
    const targetId = pendingConnection.target;

    const parseNodeId = (nid: string) => {
      const idx = nid.indexOf("-");
      if (idx === -1) return { type: nid, id: nid };
      return { type: nid.substring(0, idx), id: nid.substring(idx + 1) };
    };

    const source = parseNodeId(sourceId);
    const target = parseNodeId(targetId);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("campaign_mind_map_edges")
      .insert({
        campaign_id: campaignId,
        source_type: source.type,
        source_id: source.id,
        target_type: target.type,
        target_id: target.id,
        relationship: selectedRelationship,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      const newEdge: Edge = {
        id: `edge-${data.id}`,
        source: sourceId,
        target: targetId,
        label: selectedRelationship.replace(/_/g, " "),
        style: {
          stroke: EDGE_COLORS[selectedRelationship] ?? "#6b7280",
          strokeWidth: 1,
          opacity: 0.5,
        },
        animated: selectedRelationship !== "linked_to",
        labelStyle: { fontSize: 9, fill: "#9ca3af" },
      };
      setAllEdges((prev) => [...prev, newEdge]);
    }

    setPendingConnection(null);
  }, [pendingConnection, editingEdge, selectedRelationship, campaignId, setAllEdges]);

  const cancelDialog = useCallback(() => {
    setPendingConnection(null);
    setEditingEdge(null);
  }, []);

  /* ---- Tooltip content renderer ---- */
  const renderTooltipContent = useCallback(
    (node: MindMapNode) => {
      const d = node.data as Record<string, unknown>;
      switch (node.type) {
        case "npc": {
          const isAlive = d.isAlive !== false;
          const isHidden = d.isHidden === true;
          return (
            <div className="space-y-1">
              <p className="font-semibold text-purple-300">{d.label as string}</p>
              <div className="flex gap-2">
                {d.hp != null && (
                  <span className="text-red-300">
                    {t("tooltip_hp")} {d.hp as number}
                  </span>
                )}
                {d.ac != null && (
                  <span className="text-blue-300">
                    {t("tooltip_ac")} {d.ac as number}
                  </span>
                )}
              </div>
              <p className={isAlive ? "text-emerald-300" : "text-red-400"}>
                {isAlive ? t("tooltip_alive") : t("tooltip_dead")}
              </p>
              {isHidden && (
                <p className="text-yellow-300/70 text-[10px]">{t("tooltip_hidden_npc")}</p>
              )}
            </div>
          );
        }
        case "note":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-blue-300">{d.label as string}</p>
              {(d.noteTypeLabel as string) ? (
                <p className="text-muted-foreground">{d.noteTypeLabel as string}</p>
              ) : null}
              <p className={d.isShared ? "text-blue-300" : "text-gray-400"}>
                {d.isShared ? t("tooltip_shared") : t("tooltip_private")}
              </p>
            </div>
          );
        case "player":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-emerald-300">{d.label as string}</p>
              {(d.characterName as string) ? (
                <p className="text-emerald-300/60">{d.characterName as string}</p>
              ) : null}
            </div>
          );
        case "session":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-red-300">{d.label as string}</p>
              <p className={d.isActive ? "text-red-300" : "text-gray-400"}>
                {d.statusLabel as string}
              </p>
              {(d.encounterCount as number) > 0 && (
                <p className="text-muted-foreground">
                  {t("tooltip_encounters", { count: d.encounterCount as number })}
                </p>
              )}
            </div>
          );
        case "quest":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-yellow-300">{d.label as string}</p>
              <p className="text-muted-foreground capitalize">{d.status as string}</p>
            </div>
          );
        case "location":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-cyan-300">{d.label as string}</p>
              <p className="text-muted-foreground">{d.locationTypeLabel as string}</p>
              <p className={d.isDiscovered ? "text-cyan-300" : "text-yellow-300/70"}>
                {d.isDiscovered ? t("tooltip_discovered") : t("tooltip_undiscovered")}
              </p>
            </div>
          );
        case "faction":
          return (
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">{d.label as string}</p>
              <p className="text-muted-foreground">{d.alignmentLabel as string}</p>
            </div>
          );
        case "bag": {
          const itemNames = (d.itemNames as string[]) ?? [];
          return (
            <div className="space-y-1">
              <p className="font-semibold text-orange-300">{d.label as string}</p>
              <p className="text-muted-foreground">
                {t("tooltip_items_preview", { count: d.itemCount as number })}
              </p>
              {itemNames.length > 0 && (
                <ul className="text-orange-300/70 text-[10px] list-disc pl-3">
                  {itemNames.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        }
        default:
          return <p className="text-muted-foreground">{d.label as string}</p>;
      }
    },
    [t]
  );

  /* ---- Memoized node counts per type (for filter chip badges) ---- */
  const nodeCountsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of allNodes) {
      if (n.type && n.type !== "campaign") {
        counts[n.type] = (counts[n.type] ?? 0) + 1;
      }
    }
    return counts;
  }, [allNodes]);

  /* ---- Memoized default viewport ---- */
  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.8 }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        {t("loading")}
      </div>
    );
  }

  const showDialog = pendingConnection || editingEdge;

  return (
    <div className="space-y-2">
      {/* Top bar: layout modes + filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex gap-1 border-r border-border pr-2.5 mr-1">
          {LAYOUT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLayoutMode(mode)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                layoutMode === mode
                  ? "bg-amber-400/20 border border-amber-400 text-amber-300"
                  : "border border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {t(`layout_${mode}`)}
            </button>
          ))}
        </div>

        {FILTER_CONFIG.map(({ key, color, activeColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleFilter(key)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
              filters[key] ? activeColor : color
            } ${collapsedGroups.has(key) ? "ring-1 ring-white/20" : ""}`}
          >
            {t(`filter_${key}`)}
            {collapsedGroups.has(key) && (
              <span className="ml-1 text-[9px] opacity-60">
                ({nodeCountsByType[key] ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {connectingFromNode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs">
          <span className="animate-pulse">&#9679;</span>
          <span>{t("connecting_banner")}</span>
        </div>
      )}

      <div className={fullscreen
        ? "fixed inset-0 z-50 bg-surface-overlay overflow-hidden"
        : "h-[500px] w-full rounded-lg overflow-hidden border border-border bg-surface-overlay"
      }>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onConnect={onConnect}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#ffffff10"
          />
          <Controls
            showInteractive={false}
            className="!bg-surface-overlay !border-border !shadow-lg [&>button]:!bg-surface-overlay [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-card"
          />
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-surface-overlay/90 border border-border text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            title={fullscreen ? t("exit_fullscreen") : t("fullscreen")}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.7)"
            className="!bg-surface-deep !border-border"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {hoveredNode && tooltipPos && (
        <div
          className="fixed z-[60] pointer-events-none max-w-[220px] rounded-lg border border-border bg-surface-overlay/95 backdrop-blur-sm shadow-xl px-3 py-2 text-xs"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          {renderTooltipContent(hoveredNode)}
        </div>
      )}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={closeContextMenu} />
          <div
            className="fixed z-[60] min-w-[180px] rounded-lg border border-border bg-surface-overlay shadow-xl py-1"
            style={{
              left: Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200),
              top: Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 200),
            }}
          >
            {contextMenu.type === "node" &&
              contextMenu.nodeType !== "campaign" &&
              contextMenu.nodeType !== "group" && (
                <>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-card transition-colors"
                    onClick={handleViewDetails}
                  >
                    {t("ctx_view_details")}
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-card transition-colors"
                    onClick={handleCreateLinkedNote}
                  >
                    {t("ctx_create_linked_note")}
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-card transition-colors"
                    onClick={handleConnectTo}
                  >
                    {t("ctx_connect_to")}
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-card transition-colors"
                    onClick={handleCollapseGroup}
                  >
                    {t(`filter_${contextMenu.nodeType}`)} &#9654; {t("collapse_group")}
                  </button>
                </>
              )}
            {contextMenu.type === "edge" && (
              <>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-card transition-colors"
                  onClick={handleChangeRelationship}
                >
                  {t("ctx_change_relationship")}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-card transition-colors"
                  onClick={handleRemoveConnection}
                >
                  {t("ctx_remove_connection")}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-overlay border border-border rounded-xl p-5 shadow-2xl w-[320px] space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t("connect_title")}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {RELATIONSHIP_OPTIONS.map(({ value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedRelationship(value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedRelationship === value
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {t(`rel_${value}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelDialog}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-card"
              >
                {t("connect_cancel")}
              </button>
              <button
                type="button"
                onClick={confirmConnection}
                className="px-3 py-1.5 rounded-lg bg-amber-400/20 border border-amber-400 text-xs font-medium text-amber-300 hover:bg-amber-400/30"
              >
                {t("connect_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
