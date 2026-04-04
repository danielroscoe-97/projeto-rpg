"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Node, Edge } from "@xyflow/react";

import { createClient } from "@/lib/supabase/client";
import { applyMindMapLayout, nodeKeyToId } from "@/lib/utils/mind-map-layout";
import type {
  PlayerVisibleNodesResponse,
} from "@/lib/types/player-mind-map";
import type { NpcNodeData } from "@/components/campaign/nodes/NpcNode";
import type { NoteNodeData } from "@/components/campaign/nodes/NoteNode";
import type { PlayerNodeData } from "@/components/campaign/nodes/PlayerNode";
import type { SessionNodeData } from "@/components/campaign/nodes/SessionNode";
import type { QuestNodeData } from "@/components/campaign/nodes/QuestNode";
import type { BagNodeData } from "@/components/campaign/nodes/BagNode";
import type { LocationNodeData } from "@/components/campaign/nodes/LocationNode";
import type { FactionNodeData } from "@/components/campaign/nodes/FactionNode";
import type { CampaignNodeData } from "@/components/campaign/nodes/CampaignNode";

/* ---------- Constants ---------- */

const CAMPAIGN_EDGE_STYLE = { stroke: "#d4a44a", strokeWidth: 1.5, opacity: 0.6 };

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

/* ---------- Types ---------- */

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

export type PlayerMindMapNode = Node<MindMapNodeData>;

/* ---------- Hook ---------- */

export function usePlayerMindMap(campaignId: string, campaignName: string) {
  const t = useTranslations("mindmap");
  const tLocations = useTranslations("locations");
  const tFactions = useTranslations("factions");
  const [nodes, setNodes] = useState<PlayerMindMapNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const buildGraph = useCallback(
    (data: PlayerVisibleNodesResponse) => {
      const newNodes: PlayerMindMapNode[] = [];
      const newEdges: Edge[] = [];

      // Campaign central node
      newNodes.push({
        id: "campaign",
        type: "campaign",
        position: { x: 0, y: 0 },
        data: { label: campaignName },
        draggable: false,
      });

      // NPC nodes (server already filtered by visibility)
      for (const npc of data.npcs) {
        const nodeId = `npc-${npc.id}`;
        newNodes.push({
          id: nodeId,
          type: "npc",
          position: { x: 0, y: 0 },
          data: {
            label: npc.name,
            npcId: npc.id,
            isAlive: npc.is_alive,
            isHidden: false,
          },
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Location nodes (server sends "???" for undiscovered)
      for (const loc of data.locations) {
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
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Faction nodes (server already filtered)
      for (const fac of data.factions) {
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
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Quest nodes (server already filtered)
      for (const quest of data.quests) {
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
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Note nodes (server already filtered by is_shared)
      for (const note of data.notes) {
        const nodeId = `note-${note.id}`;
        newNodes.push({
          id: nodeId,
          type: "note",
          position: { x: 0, y: 0 },
          data: {
            label: note.title || t("notes_group"),
            isShared: true,
            noteId: note.id,
            noteType: note.note_type,
            noteTypeLabel: note.note_type !== "general" ? t(`note_type_${note.note_type}`) : undefined,
          },
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Session nodes
      for (const session of data.sessions) {
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
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Bag of Holding
      if (data.bag_items.length > 0) {
        const bagNodeId = "bag-holding";
        newNodes.push({
          id: bagNodeId,
          type: "bag",
          position: { x: 0, y: 0 },
          data: {
            label: t("bag_node"),
            itemCount: data.bag_items.length,
            itemsLabel: t("bag_item_count", { count: data.bag_items.length }),
          },
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${bagNodeId}`,
          source: "campaign",
          target: bagNodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Player member nodes
      for (const member of data.members) {
        const nodeId = `player-${member.id}`;
        newNodes.push({
          id: nodeId,
          type: "player",
          position: { x: 0, y: 0 },
          data: {
            label: member.character_name ?? "Player",
            characterName: member.character_name,
            memberId: member.id,
          },
          draggable: false,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: CAMPAIGN_EDGE_STYLE,
        });
      }

      // Custom edges — filter: only show if BOTH nodes exist in visible set
      const nodeIdSet = new Set(newNodes.map((n) => n.id));
      for (const ce of data.edges) {
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

      // Load saved positions from DM layout (read-only)
      const posMap = new Map<string, { x: number; y: number }>();
      for (const lp of data.layout) {
        posMap.set(nodeKeyToId(lp.node_key), { x: lp.x, y: lp.y });
      }
      savedPositionsRef.current = posMap;

      // Apply layout
      const laidOut = applyMindMapLayout(newNodes, newEdges, posMap);
      setNodes(laidOut);
      setEdges(newEdges);
    },
    [campaignName, t, tLocations, tFactions]
  );

  // Fetch data via RPC
  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("get_player_visible_nodes", {
      p_campaign_id: campaignId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const response = data as unknown as PlayerVisibleNodesResponse;
    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    buildGraph(response);
    setLoading(false);
  }, [campaignId, buildGraph]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced refetch for realtime — prevents stampede when DM makes rapid changes
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefetch = useCallback(() => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(() => {
      fetchData();
    }, 500);
  }, [fetchData]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    };
  }, []);

  // Realtime subscriptions for visibility changes
  useEffect(() => {
    const supabase = createClient();
    const tables = [
      "campaign_npcs",
      "campaign_locations",
      "campaign_factions",
      "campaign_quests",
      "campaign_mind_map_edges",
      "campaign_notes",
      "sessions",
      "party_inventory_items",
    ];

    let channel = supabase.channel(`player-mindmap-${campaignId}`);
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `campaign_id=eq.${campaignId}`,
        },
        debouncedRefetch
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, debouncedRefetch]);

  return { nodes, edges, loading, error, refetch: fetchData };
}
