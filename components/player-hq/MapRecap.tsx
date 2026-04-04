"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CheckCheck } from "lucide-react";
import type { PlayerMindMapNode } from "@/lib/hooks/usePlayerMindMap";

interface MapRecapProps {
  nodes: PlayerMindMapNode[];
  isNew: (nodeId: string) => boolean;
  onMarkAllViewed: (nodeIds: string[]) => void;
}

export function MapRecap({ nodes, isNew, onMarkAllViewed }: MapRecapProps) {
  const t = useTranslations("player_hq");
  const [expanded, setExpanded] = useState(false);

  const newNodes = useMemo(
    () => nodes.filter((n) => n.type !== "campaign" && n.type !== "pin" && isNew(n.id)),
    [nodes, isNew]
  );

  if (newNodes.length === 0) return null;

  const nodeTypeLabels: Record<string, string> = {
    npc: t("recap.type_npc"),
    quest: t("recap.type_quest"),
    location: t("recap.type_location"),
    faction: t("recap.type_faction"),
    session: t("recap.type_session"),
    note: t("recap.type_note"),
  };

  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
      >
        <span className="text-amber-400 text-xs font-semibold flex-1">
          {t("recap.title", { count: newNodes.length })}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-amber-400/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {newNodes.slice(0, 10).map((node) => {
            const typeLabel = nodeTypeLabels[node.type ?? ""] ?? "";
            const label = (node.data as Record<string, unknown>).label as string;
            return (
              <div key={node.id} className="flex items-center gap-2 text-xs">
                <span className="text-amber-400/60">{typeLabel}</span>
                <span className="text-foreground/80 truncate">{label}</span>
              </div>
            );
          })}
          {newNodes.length > 10 && (
            <p className="text-xs text-muted-foreground">
              +{newNodes.length - 10} {t("recap.more")}
            </p>
          )}
          <button
            type="button"
            onClick={() => onMarkAllViewed(newNodes.map((n) => n.id))}
            className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 mt-2 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t("recap.mark_all_seen")}
          </button>
        </div>
      )}
    </div>
  );
}
