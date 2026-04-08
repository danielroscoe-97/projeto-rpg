"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { MapPin, Castle, TreePine, Building, Mountain } from "lucide-react";
import type { LocationType } from "@/lib/types/mind-map";

export interface LocationNodeData {
  label: string;
  locationType: LocationType;
  locationTypeLabel: string;
  isDiscovered: boolean;
  locationId: string;
  [key: string]: unknown;
}

interface LocationNodeProps {
  data: LocationNodeData;
}

const typeIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  city: Castle,
  dungeon: Mountain,
  wilderness: TreePine,
  building: Building,
  region: MapPin,
};

function LocationNodeComponent({ data }: LocationNodeProps) {
  const Icon = typeIcons[data.locationType] ?? MapPin;
  const isHidden = !data.isDiscovered;
  const isNodeNew = data.isNodeNew === true;

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-surface-overlay shadow-md min-w-[120px] relative ${
        isHidden ? "border-green-400/30 border-dashed" : "border-green-400/60"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        {isHidden ? (
          <span className="text-green-400/50 font-bold text-sm">?</span>
        ) : (
          <Icon className="h-4 w-4 text-green-400 flex-shrink-0" />
        )}
        <span
          className={`font-semibold text-xs truncate max-w-[140px] ${
            isHidden ? "text-green-400/50 italic" : "text-green-400"
          }`}
        >
          {isHidden ? "???" : data.label}
        </span>
      </div>
      {!isHidden && (
        <div className="mt-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-300">
            {data.locationTypeLabel}
          </span>
        </div>
      )}
      {isNodeNew && !isHidden && (
        <span className="absolute -top-2 -right-2 z-10 new-badge-enter px-1.5 py-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-black shadow-lg shadow-amber-500/30">NEW</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-green-400 !w-2 !h-2" />
    </div>
  );
}

export const LocationNode = memo(LocationNodeComponent);
