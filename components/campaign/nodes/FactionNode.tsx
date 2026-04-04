"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { FactionAlignment } from "@/lib/types/mind-map";

export interface FactionNodeData {
  label: string;
  alignment: FactionAlignment;
  alignmentLabel: string;
  factionId: string;
  [key: string]: unknown;
}

interface FactionNodeProps {
  data: FactionNodeData;
}

const alignmentStyles: Record<FactionAlignment, { border: string; text: string; badge: string }> = {
  ally: {
    border: "border-emerald-400/60",
    text: "text-rose-400",
    badge: "bg-emerald-900/40 text-emerald-300",
  },
  neutral: {
    border: "border-gray-400/60",
    text: "text-rose-400",
    badge: "bg-gray-800/40 text-gray-300",
  },
  hostile: {
    border: "border-red-500/60",
    text: "text-rose-400",
    badge: "bg-red-900/40 text-red-300",
  },
};

function FactionNodeComponent({ data }: FactionNodeProps) {
  const style = alignmentStyles[data.alignment];

  return (
    <div className={`px-4 py-3 rounded-lg border ${style.border} bg-surface-overlay shadow-md min-w-[120px]`}>
      <Handle type="target" position={Position.Top} className="!bg-rose-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-rose-400 flex-shrink-0" />
        <span className={`${style.text} font-semibold text-xs truncate max-w-[120px]`}>
          {data.label}
        </span>
      </div>
      <div className="mt-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.badge}`}>
          {data.alignmentLabel}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-400 !w-2 !h-2" />
    </div>
  );
}

export const FactionNode = memo(FactionNodeComponent);
