"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import type { PinColor } from "@/lib/hooks/usePlayerPins";

export interface PinNodeData {
  label: string;
  note: string;
  pinColor: PinColor;
  pinId: string;
  [key: string]: unknown;
}

interface PinNodeProps {
  data: PinNodeData;
}

const PIN_COLORS: Record<PinColor, { border: string; text: string; icon: string }> = {
  amber: { border: "border-amber-400/60", text: "text-amber-400", icon: "text-amber-400" },
  blue: { border: "border-blue-400/60", text: "text-blue-400", icon: "text-blue-400" },
  green: { border: "border-emerald-400/60", text: "text-emerald-400", icon: "text-emerald-400" },
  red: { border: "border-red-400/60", text: "text-red-400", icon: "text-red-400" },
  purple: { border: "border-purple-400/60", text: "text-purple-400", icon: "text-purple-400" },
};

function PinNodeComponent({ data }: PinNodeProps) {
  const colors = PIN_COLORS[data.pinColor] ?? PIN_COLORS.amber;

  return (
    <div
      className={`px-3 py-2 rounded-lg border ${colors.border} bg-surface-overlay/80 shadow-md min-w-[80px] max-w-[140px] backdrop-blur-sm`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-1.5 !h-1.5" />
      <div className="flex items-center gap-1.5">
        <StickyNote className={`h-3 w-3 flex-shrink-0 ${colors.icon}`} />
        <span className={`${colors.text} font-medium text-[10px] truncate`}>
          {data.label || "Pin"}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-1.5 !h-1.5" />
    </div>
  );
}

export const PinNode = memo(PinNodeComponent);
