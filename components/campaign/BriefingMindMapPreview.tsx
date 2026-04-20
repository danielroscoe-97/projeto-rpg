"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Network, ArrowRight } from "lucide-react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { createClient } from "@/lib/supabase/client";
import type { PlayerVisibleNodesResponse } from "@/lib/types/player-mind-map";

interface BriefingMindMapPreviewProps {
  campaignId: string;
}

interface PreviewNodeData extends Record<string, unknown> {
  label: string;
  kind: string;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 40;

const KIND_COLORS: Record<string, string> = {
  campaign: "#f59e0b",
  npc: "#a78bfa",
  note: "#60a5fa",
  player: "#34d399",
  session: "#60a5fa",
  quest: "#eab308",
  location: "#4ade80",
  faction: "#fb7185",
};

const EDGE_STYLE = { stroke: "#d4a44a", strokeWidth: 1, opacity: 0.4 };

/**
 * Very compact node renderer — no handles visible, just a pill-shaped chip.
 */
function PreviewChipNode({ data }: { data: PreviewNodeData }) {
  const color = KIND_COLORS[data.kind] ?? "#6b7280";
  return (
    <div
      className="px-3 py-1.5 rounded-full border text-[11px] font-medium text-foreground bg-card shadow-sm whitespace-nowrap overflow-hidden text-ellipsis"
      style={{
        borderColor: color,
        maxWidth: NODE_WIDTH,
      }}
      title={data.label}
    >
      {data.label}
    </div>
  );
}

const nodeTypes = { chip: PreviewChipNode };

function applyLayout(nodes: Node<PreviewNodeData>[], edges: Edge[]): Node<PreviewNodeData>[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 60 });
  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

/**
 * "Teia viva" — mini-preview do Entity Graph
 * (SPEC-campaign-dashboard-briefing §3.4).
 *
 * Behavior:
 * - Fetches via existing RPC `get_player_visible_nodes` (DM sees all).
 * - Ranks nodes by edge degree (source_id ∪ target_id), takes top 15.
 * - Renders with ReactFlow + dagre (LR), zoom/pan/selection off.
 * - Fallback when < 5 edges: narrative empty copy + CTA to full map.
 * - Client-side Suspense via mount-time fetch — keeps SSR B04 budget intact.
 */
export function BriefingMindMapPreview({ campaignId }: BriefingMindMapPreviewProps) {
  const t = useTranslations("briefing");
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; nodes: Node<PreviewNodeData>[]; edges: Edge[]; edgeCount: number }
  >({ kind: "loading" });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_player_visible_nodes", {
          p_campaign_id: campaignId,
        });
        if (cancelled || ctrl.signal.aborted) return;

        if (error) {
          setState({ kind: "error", message: error.message });
          return;
        }
        const resp = data as PlayerVisibleNodesResponse | null;
        if (!resp || resp.error) {
          setState({ kind: "error", message: resp?.error ?? "unknown" });
          return;
        }

        const edges = resp.edges ?? [];

        // Degree map keyed by `${type}-${id}` (matches CampaignMindMap convention)
        const degree = new Map<string, number>();
        const bump = (key: string) =>
          degree.set(key, (degree.get(key) ?? 0) + 1);
        for (const e of edges) {
          bump(`${e.source_type}-${e.source_id}`);
          bump(`${e.target_type}-${e.target_id}`);
        }

        // Candidate nodes across all types
        type Candidate = { id: string; kind: string; label: string };
        const candidates: Candidate[] = [];
        for (const n of resp.npcs ?? []) candidates.push({ id: `npc-${n.id}`, kind: "npc", label: n.name });
        for (const n of resp.locations ?? []) candidates.push({ id: `location-${n.id}`, kind: "location", label: n.name });
        for (const n of resp.factions ?? []) candidates.push({ id: `faction-${n.id}`, kind: "faction", label: n.name });
        for (const n of resp.quests ?? []) candidates.push({ id: `quest-${n.id}`, kind: "quest", label: n.title });
        for (const n of resp.notes ?? []) candidates.push({ id: `note-${n.id}`, kind: "note", label: n.title });
        for (const n of resp.sessions ?? []) candidates.push({ id: `session-${n.id}`, kind: "session", label: n.name });
        for (const n of resp.members ?? []) candidates.push({
          id: `player-${n.id}`,
          kind: "player",
          label: n.character_name ?? "Player",
        });

        // Sort by degree DESC, keep top 15 (spec §3.4)
        candidates.sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
        const topIds = new Set(candidates.slice(0, 15).map((c) => c.id));

        const reactFlowNodes: Node<PreviewNodeData>[] = candidates
          .filter((c) => topIds.has(c.id))
          .map((c) => ({
            id: c.id,
            type: "chip",
            position: { x: 0, y: 0 },
            data: { label: c.label, kind: c.kind },
            draggable: false,
            selectable: false,
          }));

        const reactFlowEdges: Edge[] = [];
        for (const e of edges) {
          const sId = `${e.source_type}-${e.source_id}`;
          const tId = `${e.target_type}-${e.target_id}`;
          if (topIds.has(sId) && topIds.has(tId)) {
            reactFlowEdges.push({
              id: `edge-${e.id}`,
              source: sId,
              target: tId,
              style: EDGE_STYLE,
            });
          }
        }

        const laid = applyLayout(reactFlowNodes, reactFlowEdges);
        setState({ kind: "ok", nodes: laid, edges: reactFlowEdges, edgeCount: edges.length });
      } catch (err) {
        if (cancelled || ctrl.signal.aborted) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [campaignId]);

  const fullMapHref = useMemo(() => `?section=mindmap`, []);

  return (
    <section className="space-y-3" aria-labelledby="briefing-mindmap-title">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="briefing-mindmap-title"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2"
        >
          <Network className="w-3.5 h-3.5" aria-hidden="true" />
          {t("mindmap_title")}
        </h2>
        <Link
          href={fullMapHref}
          scroll={false}
          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          {t("mindmap_open_full")}
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative h-[240px] w-full rounded-xl border border-white/[0.06] bg-card/40 overflow-hidden">
        {state.kind === "loading" && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
              <span>{t("mindmap_loading")}</span>
            </div>
          </div>
        )}
        {state.kind === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground px-6 text-center">
            {t("mindmap_error")}
          </div>
        )}
        {state.kind === "ok" && state.edgeCount < 5 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Network className="w-8 h-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("mindmap_empty_cta")}
            </p>
            <Link
              href={fullMapHref}
              scroll={false}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-colors"
            >
              {t("mindmap_open_full")}
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        )}
        {state.kind === "ok" && state.edgeCount >= 5 && (
          <ReactFlow
            nodes={state.nodes}
            edges={state.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            zoomOnScroll={false}
            zoomOnPinch={false}
            panOnScroll={false}
            panOnDrag={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            preventScrolling={false}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="#ffffff10"
            />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
