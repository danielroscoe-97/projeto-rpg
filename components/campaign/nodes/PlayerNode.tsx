"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";

export interface PlayerNodeData {
  label: string;
  characterName: string | null;
  memberId: string;
  [key: string]: unknown;
}

interface PlayerNodeProps {
  data: PlayerNodeData;
}

function PlayerNodeComponent({ data }: PlayerNodeProps) {
  return (
    <div className="px-4 py-3 rounded-lg border border-emerald-400/60 bg-surface-overlay shadow-md min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span className="text-emerald-400 font-semibold text-xs truncate max-w-[140px]">
          {data.label}
        </span>
      </div>
      {data.characterName && (
        <p className="text-[10px] text-emerald-300/60 mt-1 truncate max-w-[160px]">
          {data.characterName}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-2 !h-2" />
    </div>
  );
}

export const PlayerNode = memo(PlayerNodeComponent);
