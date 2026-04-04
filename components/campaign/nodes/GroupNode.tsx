"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  ChevronRight,
  Users,
  FileText,
  User,
  Scroll,
  Target,
  Backpack,
  MapPin,
  Flag,
} from "lucide-react";

export interface GroupNodeData {
  label: string;
  count: number;
  groupType: string;
  [key: string]: unknown;
}

interface GroupNodeProps {
  data: GroupNodeData;
}

const groupConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    handle: string;
    border: string;
  }
> = {
  npc: { icon: Users, color: "text-purple-400", handle: "!bg-purple-400", border: "border-purple-400/40" },
  note: { icon: FileText, color: "text-blue-400", handle: "!bg-blue-400", border: "border-blue-400/40" },
  player: { icon: User, color: "text-emerald-400", handle: "!bg-emerald-400", border: "border-emerald-400/40" },
  session: { icon: Scroll, color: "text-red-400", handle: "!bg-red-400", border: "border-red-400/40" },
  quest: { icon: Target, color: "text-yellow-400", handle: "!bg-yellow-400", border: "border-yellow-400/40" },
  bag: { icon: Backpack, color: "text-orange-400", handle: "!bg-orange-400", border: "border-orange-400/40" },
  location: { icon: MapPin, color: "text-cyan-400", handle: "!bg-cyan-400", border: "border-cyan-400/40" },
  faction: { icon: Flag, color: "text-rose-400", handle: "!bg-rose-400", border: "border-rose-400/40" },
};

function GroupNodeComponent({ data }: GroupNodeProps) {
  const config = groupConfig[data.groupType] ?? groupConfig.npc;
  const Icon = config.icon;

  return (
    <div
      className={`px-4 py-3 rounded-lg border border-dashed ${config.border} bg-surface-overlay/80 shadow-md min-w-[140px] cursor-pointer hover:bg-surface-overlay transition-colors`}
    >
      <Handle type="target" position={Position.Top} className={`${config.handle} !w-2 !h-2`} />
      <div className="flex items-center gap-2">
        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
        <span className={`${config.color} font-semibold text-xs`}>{data.label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground font-mono">
          {data.count}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className={`${config.handle} !w-2 !h-2`} />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
