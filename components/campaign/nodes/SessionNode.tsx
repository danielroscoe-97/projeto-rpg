"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Scroll } from "lucide-react";

export interface SessionNodeData {
  label: string;
  isActive: boolean;
  sessionId: string;
  statusLabel: string;
  [key: string]: unknown;
}

interface SessionNodeProps {
  data: SessionNodeData;
}

function SessionNodeComponent({ data }: SessionNodeProps) {
  return (
    <div className="px-4 py-3 rounded-lg border border-red-400/60 bg-surface-overlay shadow-md min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Scroll className="h-4 w-4 text-red-400 flex-shrink-0" />
        <span className="text-red-400 font-semibold text-xs truncate max-w-[140px]">
          {data.label}
        </span>
      </div>
      <div className="mt-1.5">
        {data.isActive ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 animate-pulse">
            {data.statusLabel}
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/40 text-gray-400">
            {data.statusLabel}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-red-400 !w-2 !h-2" />
    </div>
  );
}

export const SessionNode = memo(SessionNodeComponent);
