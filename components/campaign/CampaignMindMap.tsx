"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { createClient } from "@/lib/supabase/client";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";
import type { CampaignNote } from "@/lib/types/database";
import { CampaignNode, type CampaignNodeData } from "./nodes/CampaignNode";
import { NpcNode, type NpcNodeData } from "./nodes/NpcNode";
import { NoteNode, type NoteNodeData } from "./nodes/NoteNode";
import { PlayerNode, type PlayerNodeData } from "./nodes/PlayerNode";

/* ---------- Types ---------- */

interface NoteNpcLink {
  note_id: string;
  npc_id: string;
}

type MindMapNode = Node<CampaignNodeData | NpcNodeData | NoteNodeData | PlayerNodeData>;

/* ---------- Node types map ---------- */

const nodeTypes: NodeTypes = {
  campaign: CampaignNode,
  npc: NpcNode,
  note: NoteNode,
  player: PlayerNode,
};

/* ---------- Dagre layout ---------- */

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;

function applyDagreLayout(nodes: MindMapNode[], edges: Edge[]): MindMapNode[] {
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

/* ---------- Component ---------- */

interface CampaignMindMapProps {
  campaignId: string;
  campaignName: string;
}

export function CampaignMindMap({ campaignId, campaignName }: CampaignMindMapProps) {
  const t = useTranslations("mindmap");
  const tNotes = useTranslations("notes");
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  /* ---- Fetch all data ---- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const [npcsRes, notesRes, membersRes, linksRes] = await Promise.all([
        supabase
          .from("campaign_npcs")
          .select("id, name, stats, avatar_url, is_visible_to_players")
          .eq("campaign_id", campaignId)
          .order("name"),
        supabase
          .from("campaign_notes")
          .select("id, title, is_shared")
          .eq("campaign_id", campaignId)
          .order("title"),
        supabase
          .from("campaign_members")
          .select("id, user_id, role, users!campaign_members_user_id_fkey(display_name, email)")
          .eq("campaign_id", campaignId)
          .eq("status", "active"),
        supabase
          .from("note_npc_links")
          .select("note_id, npc_id"),
      ]);

      if (cancelled) return;

      const npcs = (npcsRes.data ?? []) as Array<Pick<CampaignNpc, "id" | "name" | "stats" | "avatar_url" | "is_visible_to_players">>;
      const notes = (notesRes.data ?? []) as Array<Pick<CampaignNote, "id" | "title" | "is_shared">>;
      const membersRaw = (membersRes.data ?? []) as unknown as Array<{
        id: string;
        user_id: string;
        role: string;
        users: { display_name: string | null; email: string } | null;
      }>;
      const links = (linksRes.data ?? []) as NoteNpcLink[];

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
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: { stroke: "#d4a44a", strokeWidth: 1.5, opacity: 0.6 },
        });
      }

      // Note nodes
      for (const note of notes) {
        const nodeId = `note-${note.id}`;
        newNodes.push({
          id: nodeId,
          type: "note",
          position: { x: 0, y: 0 },
          data: {
            label: note.title || tNotes("untitled"),
            isShared: note.is_shared,
            noteId: note.id,
          },
          draggable: true,
        });
        newEdges.push({
          id: `campaign-${nodeId}`,
          source: "campaign",
          target: nodeId,
          style: { stroke: "#d4a44a", strokeWidth: 1.5, opacity: 0.6 },
        });
      }

      // Player member nodes
      for (const member of membersRaw) {
        const nodeId = `member-${member.id}`;
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
          style: { stroke: "#d4a44a", strokeWidth: 1.5, opacity: 0.6 },
        });
      }

      // Note ↔ NPC cross-links
      for (const link of links) {
        const noteNodeId = `note-${link.note_id}`;
        const npcNodeId = `npc-${link.npc_id}`;
        // Only add if both nodes exist
        if (
          newNodes.some((n) => n.id === noteNodeId) &&
          newNodes.some((n) => n.id === npcNodeId)
        ) {
          newEdges.push({
            id: `link-${link.note_id}-${link.npc_id}`,
            source: noteNodeId,
            target: npcNodeId,
            style: { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 },
            animated: true,
          });
        }
      }

      /* ---- Apply layout ---- */
      const laidOut = applyDagreLayout(newNodes, newEdges);

      setNodes(laidOut);
      setEdges(newEdges);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, campaignName, setNodes, setEdges]);

  /* ---- Node click handler ---- */
  const onNodeClick: NodeMouseHandler<MindMapNode> = useCallback((_event, node) => {
    // Scroll to the corresponding section based on node type
    const sectionMap: Record<string, string> = {
      npc: "section_npcs",
      note: "section_notes",
      player: "section_members",
    };
    const nodeType = node.type ?? "";
    const sectionKey = sectionMap[nodeType];
    if (sectionKey) {
      // Find the section button by text or a data attribute and click it
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent?.includes(sectionKey === "section_npcs" ? "NPC" : "")) {
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        }
      }
    }
  }, []);

  /* ---- Minimap color function ---- */
  const minimapNodeColor = useCallback((node: MindMapNode) => {
    switch (node.type) {
      case "campaign":
        return "#f59e0b";
      case "npc":
        return "#a78bfa";
      case "note":
        return "#60a5fa";
      case "player":
        return "#34d399";
      default:
        return "#6b7280";
    }
  }, []);

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
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-border bg-[#1a1a2e]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff10" />
        <Controls
          showInteractive={false}
          className="!bg-[#1a1a2e] !border-border !shadow-lg [&>button]:!bg-[#1a1a2e] [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-card"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-[#0d0d1a] !border-border"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
