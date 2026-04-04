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
  isHidden?: boolean;
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
  const isHidden = data.isHidden === true;
  const isNodeNew = data.isNodeNew === true;

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-surface-overlay shadow-md min-w-[120px] relative ${
        isHidden ? "border-rose-400/30 border-dashed opacity-50" : style.border
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-rose-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        {isHidden ? (
          <span className="text-rose-400/50 font-bold text-sm">?</span>
        ) : (
          <Flag className="h-4 w-4 text-rose-400 flex-shrink-0" />
        )}
        <span
          className={`font-semibold text-xs truncate max-w-[120px] ${
            isHidden ? "text-rose-400/50 italic" : style.text
          }`}
        >
          {isHidden ? "???" : data.label}
        </span>
      </div>
      {!isHidden && (
        <div className="mt-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.badge}`}>
            {data.alignmentLabel}
          </span>
        </div>
      )}
      {isNodeNew && !isHidden && (
        <span className="absolute -top-2 -right-2 z-10 new-badge-enter px-1.5 py-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-black shadow-lg shadow-amber-500/30">NEW</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-rose-400 !w-2 !h-2" />
    </div>
  );
}

export const FactionNode = memo(FactionNodeComponent);
