"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Backpack } from "lucide-react";

export interface BagNodeData {
  label: string;
  itemCount: number;
  [key: string]: unknown;
}

interface BagNodeProps {
  data: BagNodeData;
}

function BagNodeComponent({ data }: BagNodeProps) {
  return (
    <div className="px-4 py-3 rounded-lg border border-orange-400/60 bg-surface-overlay shadow-md min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-orange-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Backpack className="h-4 w-4 text-orange-400 flex-shrink-0" />
        <span className="text-orange-400 font-semibold text-xs">
          {data.label}
        </span>
      </div>
      <div className="mt-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-300">
          {data.itemCount} {data.itemCount === 1 ? "item" : "items"}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-400 !w-2 !h-2" />
    </div>
  );
}

export const BagNode = memo(BagNodeComponent);
