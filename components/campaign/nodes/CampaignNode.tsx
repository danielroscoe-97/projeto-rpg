"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Crown } from "lucide-react";

export interface CampaignNodeData {
  label: string;
  [key: string]: unknown;
}

interface CampaignNodeProps {
  data: CampaignNodeData;
}

function CampaignNodeComponent({ data }: CampaignNodeProps) {
  return (
    <div className="px-5 py-4 rounded-xl border-2 border-amber-400 bg-[#1a1a2e] shadow-lg shadow-amber-400/20 min-w-[160px] text-center">
      <div className="flex items-center justify-center gap-2">
        <Crown className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <span className="text-amber-400 font-bold text-sm truncate max-w-[180px]">
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-2 !h-2" />
    </div>
  );
}

export const CampaignNode = memo(CampaignNodeComponent);
