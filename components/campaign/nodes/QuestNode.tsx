"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Target } from "lucide-react";

export interface QuestNodeData {
  label: string;
  status: "available" | "active" | "completed";
  questId: string;
  isHidden?: boolean;
  [key: string]: unknown;
}

interface QuestNodeProps {
  data: QuestNodeData;
}

const statusConfig = {
  available: { badge: "?", bg: "bg-yellow-900/40", text: "text-yellow-300" },
  active: { badge: "!", bg: "bg-yellow-900/60", text: "text-yellow-200", pulse: true },
  completed: { badge: "\u2713", bg: "bg-green-900/40", text: "text-green-300" },
} as const;

function QuestNodeComponent({ data }: QuestNodeProps) {
  const config = statusConfig[data.status];
  const isCompleted = data.status === "completed";
  const isHidden = data.isHidden === true;
  const isNodeNew = data.isNodeNew === true;

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-surface-overlay shadow-md min-w-[120px] relative ${
        isHidden
          ? "border-yellow-400/30 border-dashed opacity-50"
          : isCompleted
            ? "border-yellow-400/60 opacity-60"
            : "border-yellow-400/60"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Target className={`h-4 w-4 flex-shrink-0 ${isHidden ? "text-yellow-400/50" : "text-yellow-400"}`} />
        <span
          className={`font-semibold text-xs truncate max-w-[120px] ${
            isHidden ? "text-yellow-400/50 italic" : isCompleted ? "text-yellow-400 line-through" : "text-yellow-400"
          }`}
        >
          {isHidden ? "???" : data.label}
        </span>
        {!isHidden && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${config.bg} ${config.text} ${
              "pulse" in config && config.pulse ? "animate-pulse" : ""
            }`}
          >
            {config.badge}
          </span>
        )}
      </div>
      {isNodeNew && !isHidden && (
        <span className="absolute -top-2 -right-2 z-10 new-badge-enter px-1.5 py-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-black shadow-lg shadow-amber-500/30">NEW</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-400 !w-2 !h-2" />
    </div>
  );
}

export const QuestNode = memo(QuestNodeComponent);
