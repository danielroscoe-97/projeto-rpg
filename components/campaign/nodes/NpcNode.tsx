"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { UserCircle } from "lucide-react";

export interface NpcNodeData {
  label: string;
  hp?: number;
  ac?: number;
  npcId: string;
  [key: string]: unknown;
}

interface NpcNodeProps {
  data: NpcNodeData;
}

function NpcNodeComponent({ data }: NpcNodeProps) {
  return (
    <div className="px-4 py-3 rounded-lg border border-purple-400/60 bg-surface-overlay shadow-md min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <UserCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />
        <span className="text-purple-400 font-semibold text-xs truncate max-w-[140px]">
          {data.label}
        </span>
      </div>
      {(data.hp != null || data.ac != null) && (
        <div className="flex gap-2 mt-1.5">
          {data.hp != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">
              HP {data.hp}
            </span>
          )}
          {data.ac != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300">
              AC {data.ac}
            </span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-2 !h-2" />
    </div>
  );
}

export const NpcNode = memo(NpcNodeComponent);
