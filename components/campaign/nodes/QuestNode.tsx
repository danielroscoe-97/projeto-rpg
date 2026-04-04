"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Target } from "lucide-react";

export interface QuestNodeData {
  label: string;
  status: "available" | "active" | "completed";
  questId: string;
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

  return (
    <div
      className={`px-4 py-3 rounded-lg border border-yellow-400/60 bg-surface-overlay shadow-md min-w-[120px] ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        <span
          className={`text-yellow-400 font-semibold text-xs truncate max-w-[120px] ${
            isCompleted ? "line-through" : ""
          }`}
        >
          {data.label}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${config.bg} ${config.text} ${
            "pulse" in config && config.pulse ? "animate-pulse" : ""
          }`}
        >
          {config.badge}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-400 !w-2 !h-2" />
    </div>
  );
}

export const QuestNode = memo(QuestNodeComponent);
