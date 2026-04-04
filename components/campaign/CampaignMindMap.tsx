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

import { createClient } from "@/lib/supabase/client";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";
import type { CampaignNote } from "@/lib/types/database";
import type { NoteType, MindMapEdge, EdgeRelationship, CampaignLocation, CampaignFaction, MindMapNodeLayout } from "@/lib/types/mind-map";

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
  | FactionNodeData;

type MindMapNode = Node<MindMapNodeData>;

type NodeFilter = "npc" | "note" | "player" | "session" | "quest" | "bag" | "location" | "faction";

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
};

const FILTER_CONFIG: Array<{ key: NodeFilter; color: string; activeColor: string }> = [
  { key: "npc", color: "border-purple-400/40 text-purple-400/60", activeColor: "border-purple-400 bg-purple-400/20 text-purple-300" },
  { key: "note", color: "border-blue-400/40 text-blue-400/60", activeColor: "border-blue-400 bg-blue-400/20 text-blue-300" },
  { key: "player", color: "border-emerald-400/40 text-emerald-400/60", activeColor: "border-emerald-400 bg-emerald-400/20 text-emerald-300" },
  { key: "session", color: "border-red-400/40 text-red-400/60", activeColor: "border-red-400 bg-red-400/20 text-red-300" },
  { key: "quest", color: "border-yellow-400/40 text-yellow-400/60", activeColor: "border-yellow-400 bg-yellow-400/20 text-yellow-300" },
  { key: "bag", color: "border-orange-400/40 text-orange-400/60", activeColor: "border-orange-400 bg-orange-400/20 text-orange-300" },
  { key: "location", color: "border-cyan-400/40 text-cyan-400/60", activeColor: "border-cyan-400 bg-cyan-400/20 text-cyan-300" },
  { key: "faction", color: "border-rose-400/40 text-rose-400/60", activeColor: "border-rose-400 bg-rose-400/20 text-rose-300" },
];

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
    // Use saved position if available, otherwise use Dagre layout
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

/* ---------- Layout persistence helper ---------- */

function nodeIdToKey(nodeId: string): string {
  // 'npc-<uuid>' → 'npc:<uuid>', 'campaign' → 'campaign', 'bag-holding' → 'bag:holding'
  const idx = nodeId.indexOf("-");
  if (idx === -1) return nodeId;
  return nodeId.substring(0, idx) + ":" + nodeId.substring(idx + 1);
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

  /* ---- Toggle filter ---- */
  const toggleFilter = useCallback((key: NodeFilter) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ---- Save layout (debounced) ---- */
  const saveLayout = useCallback(
    (nodeId: string, x: number, y: number) => {
      savedPositionsRef.current.set(nodeId, { x, y });

      // Debounce DB writes
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

        // Upsert all changed positions — best-effort, silent fail
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

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  /* ---- Handle node drag end ---- */
  const handleNodesChange = useCallback(
    (changes: NodeChange<MindMapNode>[]) => {
      onNodesChange(changes);

      // Track position changes from drag
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          saveLayout(change.id, change.position.x, change.position.y);
        }
      }
    },
    [onNodesChange, saveLayout]
  );

  /* ---- Apply filters to nodes/edges ---- */
  useEffect(() => {
    const visibleNodeIds = new Set<string>();

    const filteredNodes = allNodes.filter((node) => {
      if (node.type === "campaign") {
        visibleNodeIds.add(node.id);
        return true;
      }
      const nodeType = node.type as NodeFilter;
      if (filters[nodeType] !== false) {
        visibleNodeIds.add(node.id);
        return true;
      }
      return false;
    });

    const filteredEdges = allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    const laidOut =
      filteredNodes.length > 0
        ? applyDagreLayout(filteredNodes, filteredEdges, savedPositionsRef.current)
        : [];
    setNodes(laidOut);
    setEdges(filteredEdges);
  }, [allNodes, allEdges, filters, setNodes, setEdges]);

  /* ---- Fetch all data ---- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
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
          .select("node_key, x, y")
          .eq("campaign_id", campaignId),
      ]);

      if (cancelled) return;

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
      }>;

      // Build saved positions map from DB
      const posMap = new Map<string, { x: number; y: number }>();
      for (const lp of layoutData) {
        // Convert 'npc:<uuid>' back to 'npc-<uuid>'
        const nodeId = lp.node_key.replace(":", "-");
        posMap.set(nodeId, { x: lp.x, y: lp.y });
      }
      savedPositionsRef.current = posMap;

      // Fetch character names for player members
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

      if (cancelled) return;

      /* ---- Build nodes ---- */
      const newNodes: MindMapNode[] = [];
      const newEdges: Edge[] = [];

      // Campaign central node
      newNodes.push({
        id: "campaign",
        type: "campaign",
        position: { x: 0, y: 0 },
        data: { label: campaignName },
        draggable: true,
      });

      // NPC nodes
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

      // Note nodes
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

      // Player member nodes (use "player-" prefix to match EdgeEntityType)
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

      // Session nodes
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

      // Encounter nodes (sub-nodes of sessions)
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

      // Quest nodes
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

      // Bag of Holding node
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

      // Location nodes
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

      // Faction nodes
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

      // Cross-links: Note ↔ NPC (legacy)
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
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, campaignName, t, tNotes, tLocations, tFactions]);

  /* ---- Node click handler ---- */
  const onNodeClick: NodeMouseHandler<MindMapNode> = useCallback((_event, node) => {
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
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  /* ---- Minimap color function ---- */
  const minimapNodeColor = useCallback(
    (node: MindMapNode) => MINIMAP_COLORS[node.type ?? ""] ?? "#6b7280",
    []
  );

  /* ---- Drag-to-connect ---- */
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<EdgeRelationship>("linked_to");

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      setPendingConnection(connection);
      setSelectedRelationship("linked_to");
    }
  }, []);

  const confirmConnection = useCallback(async () => {
    if (!pendingConnection?.source || !pendingConnection?.target) return;

    const sourceId = pendingConnection.source;
    const targetId = pendingConnection.target;

    // Extract type and uuid from node IDs (e.g., 'npc-<uuid>' → type='npc', id='<uuid>')
    const parseNodeId = (nodeId: string) => {
      const idx = nodeId.indexOf("-");
      if (idx === -1) return { type: nodeId, id: nodeId };
      return { type: nodeId.substring(0, idx), id: nodeId.substring(idx + 1) };
    };

    const source = parseNodeId(sourceId);
    const target = parseNodeId(targetId);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
      // Add the edge visually
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
  }, [pendingConnection, selectedRelationship, campaignId, setAllEdges]);

  /* ---- Memoized default viewport ---- */
  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.8 }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_CONFIG.map(({ key, color, activeColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleFilter(key)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
              filters[key] ? activeColor : color
            }`}
          >
            {t(`filter_${key}`)}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border bg-surface-overlay">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
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
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.7)"
            className="!bg-surface-deep !border-border"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {/* Connection relationship dialog */}
      {pendingConnection && (
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
                onClick={() => setPendingConnection(null)}
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
