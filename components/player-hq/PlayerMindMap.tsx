"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Network } from "lucide-react";

import { usePlayerMindMap, type PlayerMindMapNode } from "@/lib/hooks/usePlayerMindMap";
import { usePlayerPins, type PinColor } from "@/lib/hooks/usePlayerPins";
import { useNodeViews } from "@/lib/hooks/useNodeViews";
import { CampaignNode } from "@/components/campaign/nodes/CampaignNode";
import { NpcNode } from "@/components/campaign/nodes/NpcNode";
import { NoteNode } from "@/components/campaign/nodes/NoteNode";
import { PlayerNode } from "@/components/campaign/nodes/PlayerNode";
import { SessionNode } from "@/components/campaign/nodes/SessionNode";
import { QuestNode } from "@/components/campaign/nodes/QuestNode";
import { BagNode } from "@/components/campaign/nodes/BagNode";
import { LocationNode } from "@/components/campaign/nodes/LocationNode";
import { FactionNode } from "@/components/campaign/nodes/FactionNode";
import { PinNode } from "@/components/campaign/nodes/PinNode";
import { PlayerNpcDrawer } from "./drawers/PlayerNpcDrawer";
import { PlayerQuestDrawer } from "./drawers/PlayerQuestDrawer";
import { PlayerLocationDrawer } from "./drawers/PlayerLocationDrawer";
import { PlayerFactionDrawer } from "./drawers/PlayerFactionDrawer";
import { PlayerSessionDrawer } from "./drawers/PlayerSessionDrawer";
import { PlayerPinDrawer } from "./drawers/PlayerPinDrawer";
import { MapRecap } from "./MapRecap";

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
  pin: PinNode,
};

/* ---------- Constants ---------- */

type NodeFilter = "npc" | "note" | "player" | "session" | "quest" | "bag" | "location" | "faction" | "pin";

const FILTER_CONFIG: Array<{ key: NodeFilter; color: string; activeColor: string }> = [
  { key: "npc", color: "border-purple-400/40 text-purple-400/60", activeColor: "border-purple-400 bg-purple-400/20 text-purple-300" },
  { key: "note", color: "border-blue-400/40 text-blue-400/60", activeColor: "border-blue-400 bg-blue-400/20 text-blue-300" },
  { key: "player", color: "border-emerald-400/40 text-emerald-400/60", activeColor: "border-emerald-400 bg-emerald-400/20 text-emerald-300" },
  { key: "session", color: "border-blue-400/40 text-blue-400/60", activeColor: "border-blue-400 bg-blue-400/20 text-blue-300" },
  { key: "quest", color: "border-yellow-400/40 text-yellow-400/60", activeColor: "border-yellow-400 bg-yellow-400/20 text-yellow-300" },
  { key: "bag", color: "border-orange-400/40 text-orange-400/60", activeColor: "border-orange-400 bg-orange-400/20 text-orange-300" },
  { key: "location", color: "border-green-400/40 text-green-400/60", activeColor: "border-green-400 bg-green-400/20 text-green-300" },
  { key: "faction", color: "border-rose-400/40 text-rose-400/60", activeColor: "border-rose-400 bg-rose-400/20 text-rose-300" },
  { key: "pin", color: "border-amber-400/40 text-amber-400/60", activeColor: "border-amber-400 bg-amber-400/20 text-amber-300" },
];

const MINIMAP_COLORS: Record<string, string> = {
  campaign: "#f59e0b",
  npc: "#a78bfa",
  note: "#60a5fa",
  player: "#34d399",
  session: "#60a5fa",
  quest: "#eab308",
  bag: "#f97316",
  location: "#4ade80",
  faction: "#fb7185",
  pin: "#f59e0b",
};

/* ---------- Drawer state ---------- */

interface DrawerState {
  type: "npc" | "quest" | "location" | "faction" | "session" | "pin" | null;
  nodeId: string;
  data: Record<string, unknown>;
}

/* ---------- Component ---------- */

interface PlayerMindMapProps {
  campaignId: string;
  campaignName: string;
  characterId: string;
  userId: string;
  onNavigateTab?: (tab: string) => void;
}

export function PlayerMindMap({ campaignId, campaignName, characterId, userId, onNavigateTab }: PlayerMindMapProps) {
  const t = useTranslations("mindmap");
  const tHq = useTranslations("player_hq");
  const searchParams = useSearchParams();
  const {
    nodes: allNodes,
    edges: allEdges,
    loading,
    error,
  } = usePlayerMindMap(campaignId, campaignName);

  const { pins, canAdd, createPin, updatePin, deletePin } = usePlayerPins(characterId, campaignId);
  const { isNew, markViewed, markAllViewed, seedFirstVisit } = useNodeViews(characterId, campaignId);

  const [nodes, setNodes, onNodesChange] = useNodesState<PlayerMindMapNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [filters, setFilters] = useState<Record<NodeFilter, boolean>>({
    npc: true,
    note: true,
    player: true,
    session: true,
    quest: true,
    bag: true,
    location: true,
    faction: true,
    pin: true,
  });
  const [drawer, setDrawer] = useState<DrawerState>({ type: null, nodeId: "", data: {} });

  /* ---- Toggle filter ---- */
  const toggleFilter = useCallback((key: NodeFilter) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ---- Wave 3c D4: auto-open drawer from `?drawer=npc:{name}` deep link.
   *      Triggered by NpcCard "Ver no Mapa →" link. The drawer opens once
   *      `allNodes` is loaded and a node matching the encoded name exists.
   *      Idempotent on repeat URL changes; closing the drawer doesn't
   *      remove the param (the user can re-open via back/refresh).      */
  useEffect(() => {
    if (loading) return;
    const drawerParam = searchParams?.get("drawer") ?? "";
    if (!drawerParam.startsWith("npc:")) return;
    const wantedName = decodeURIComponent(drawerParam.slice("npc:".length));
    if (!wantedName) return;
    const match = allNodes.find(
      (n) =>
        n.type === "npc" &&
        ((n.data as { label?: string })?.label ?? "") === wantedName,
    );
    if (!match) return;
    setDrawer({
      type: "npc",
      nodeId: match.id,
      data: match.data as Record<string, unknown>,
    });
  }, [searchParams, loading, allNodes]);

  /* ---- Seed first visit: mark all existing nodes as viewed ---- */
  useEffect(() => {
    if (!loading && allNodes.length > 1) {
      const campaignNodeIds = allNodes
        .filter((n) => n.type !== "campaign")
        .map((n) => n.id);
      seedFirstVisit(campaignNodeIds);
    }
  }, [loading, allNodes, seedFirstVisit]);

  /* ---- Build pin nodes (deterministic position from index) ---- */
  const pinNodes: PlayerMindMapNode[] = useMemo(() => {
    return pins.map((pin, i) => ({
      id: `pin-${pin.id}`,
      type: "pin" as const,
      position: {
        x: pin.position_x ?? (i % 5) * 100 - 200,
        y: pin.position_y ?? Math.floor(i / 5) * 80 + 200,
      },
      data: {
        label: pin.label,
        note: pin.note,
        pinColor: pin.color,
        pinId: pin.id,
      },
      draggable: false,
    }));
  }, [pins]);

  /* ---- Apply filters + annotate with NEW/reveal classes ---- */
  useEffect(() => {
    const visibleNodeIds = new Set<string>();
    const merged = [...allNodes, ...(filters.pin ? pinNodes : [])];

    const filteredNodes = merged.filter((node) => {
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

    // Annotate nodes with reveal animation class + isNodeNew data flag
    const annotated = filteredNodes.map((node) => {
      if (node.type === "campaign" || node.type === "pin") return node;
      const nodeIsNew = isNew(node.id);
      return {
        ...node,
        className: nodeIsNew ? "node-reveal" : undefined,
        data: { ...node.data, isNodeNew: nodeIsNew },
      };
    });

    const filteredEdges = allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    setNodes(annotated);
    setEdges(filteredEdges);
  }, [allNodes, allEdges, pinNodes, filters, isNew, setNodes, setEdges]);

  /* ---- Node click → open drawer + mark viewed ---- */
  const onNodeClick: NodeMouseHandler<PlayerMindMapNode> = useCallback((_event, node) => {
    const nodeType = node.type as string;

    // Mark as viewed (removes NEW badge)
    markViewed(node.id);

    const drawerTypes = ["npc", "quest", "location", "faction", "session", "pin"];
    if (drawerTypes.includes(nodeType)) {
      setDrawer({
        type: nodeType as DrawerState["type"],
        nodeId: node.id,
        data: node.data as Record<string, unknown>,
      });
    }
  }, [markViewed]);

  /* ---- Close drawer ---- */
  const closeDrawer = useCallback(() => {
    setDrawer({ type: null, nodeId: "", data: {} });
  }, []);

  /* ---- Add pin ---- */
  const handleAddPin = useCallback(async () => {
    if (!canAdd) return;
    await createPin({
      label: "",
      note: "",
      color: "amber",
      position_x: Math.random() * 300 - 150,
      position_y: Math.random() * 300 + 100,
    });
  }, [canAdd, createPin]);

  /* ---- Minimap color ---- */
  const minimapNodeColor = useCallback(
    (node: PlayerMindMapNode) => MINIMAP_COLORS[node.type ?? ""] ?? "#6b7280",
    []
  );

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.8 }), []);

  if (loading) {
    return (
      <div className="h-[400px] w-full rounded-lg border border-border bg-surface-overlay flex items-center justify-center">
        {/* Skeleton: 3 pulsing circles with connector lines */}
        <svg width="200" height="120" className="animate-pulse" aria-hidden="true">
          <line x1="60" y1="60" x2="140" y2="30" stroke="currentColor" className="text-white/5" strokeWidth="2" />
          <line x1="60" y1="60" x2="140" y2="90" stroke="currentColor" className="text-white/5" strokeWidth="2" />
          <circle cx="60" cy="60" r="16" className="fill-white/5" />
          <circle cx="140" cy="30" r="12" className="fill-white/5" />
          <circle cx="140" cy="90" r="12" className="fill-white/5" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter bar + Add Pin */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_CONFIG.map(({ key, color, activeColor }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleFilter(key)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
              filters[key] ? activeColor : color
            }`}
            aria-pressed={filters[key]}
          >
            {t(`filter_${key}`)}
          </button>
        ))}
        <div className="flex-1" />
        {canAdd && (
          <button
            type="button"
            onClick={handleAddPin}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-400/40 text-amber-400/80 text-[11px] font-medium hover:bg-amber-400/10 transition-all"
          >
            <Plus className="w-3 h-3" />
            {tHq("pin_drawer.add_pin")}
          </button>
        )}
      </div>

      {/* Recap: what changed since last visit */}
      <MapRecap
        nodes={allNodes}
        isNew={isNew}
        onMarkAllViewed={markAllViewed}
      />

      {/* Empty state when all filters off or no nodes */}
      {nodes.length <= 1 && !loading && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <Network className="w-6 h-6 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">{t("empty_filters")}</p>
        </div>
      )}

      {/* Mind Map */}
      <div className="h-[calc(100vh-280px)] min-h-[400px] w-full rounded-lg overflow-hidden border border-border bg-surface-overlay">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={true}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#ffffff18"
          />
          <Controls
            showInteractive={false}
            className="!bg-surface-overlay !border-border !shadow-lg [&>button]:!bg-surface-overlay [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-card"
          />
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.8)"
            className="!bg-surface-deep/80 !border-border/50 !opacity-60 hover:!opacity-100 !transition-opacity !duration-300"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {/* Drawers */}
      {drawer.type === "npc" && (
        <PlayerNpcDrawer
          npcId={(drawer.data.npcId as string) ?? ""}
          npcName={(drawer.data.label as string) ?? ""}
          characterId={characterId}
          campaignId={campaignId}
          onClose={closeDrawer}
          onNavigateTab={onNavigateTab}
        />
      )}
      {drawer.type === "quest" && (
        <PlayerQuestDrawer
          questId={(drawer.data.questId as string) ?? ""}
          questTitle={(drawer.data.label as string) ?? ""}
          questStatus={(drawer.data.status as string) ?? ""}
          userId={userId}
          campaignId={campaignId}
          onClose={closeDrawer}
          onNavigateTab={onNavigateTab}
        />
      )}
      {drawer.type === "location" && (
        <PlayerLocationDrawer
          locationName={(drawer.data.label as string) ?? ""}
          locationType={(drawer.data.locationTypeLabel as string) ?? ""}
          isDiscovered={(drawer.data.isDiscovered as boolean) ?? false}
          onClose={closeDrawer}
        />
      )}
      {drawer.type === "faction" && (
        <PlayerFactionDrawer
          factionName={(drawer.data.label as string) ?? ""}
          alignment={(drawer.data.alignmentLabel as string) ?? ""}
          onClose={closeDrawer}
        />
      )}
      {drawer.type === "session" && (
        <PlayerSessionDrawer
          sessionName={(drawer.data.label as string) ?? ""}
          isActive={(drawer.data.isActive as boolean) ?? false}
          statusLabel={(drawer.data.statusLabel as string) ?? ""}
          onClose={closeDrawer}
        />
      )}
      {drawer.type === "pin" && (
        <PlayerPinDrawer
          pinId={(drawer.data.pinId as string) ?? ""}
          initialLabel={(drawer.data.label as string) ?? ""}
          initialNote={(drawer.data.note as string) ?? ""}
          initialColor={(drawer.data.pinColor as PinColor) ?? "amber"}
          onUpdate={updatePin}
          onDelete={deletePin}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
