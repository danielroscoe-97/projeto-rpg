"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  FileText,
  Lock,
  Eye,
  BookOpen,
  MapPin,
  UserCircle,
  Scroll,
  EyeOff,
  Lightbulb,
} from "lucide-react";
import type { NoteType } from "@/lib/types/mind-map";

export interface NoteNodeData {
  label: string;
  isShared: boolean;
  noteId: string;
  noteType?: NoteType;
  noteTypeLabel?: string;
  [key: string]: unknown;
}

interface NoteNodeProps {
  data: NoteNodeData;
}

const noteTypeConfig: Record<
  NoteType,
  { icon: React.ComponentType<{ className?: string }>; border: string; text: string }
> = {
  general: { icon: FileText, border: "border-blue-400/60", text: "text-blue-400" },
  lore: { icon: BookOpen, border: "border-indigo-400/60", text: "text-indigo-400" },
  location: { icon: MapPin, border: "border-cyan-400/60", text: "text-cyan-400" },
  npc: { icon: UserCircle, border: "border-purple-400/60", text: "text-purple-400" },
  session_recap: { icon: Scroll, border: "border-orange-400/60", text: "text-orange-400" },
  secret: { icon: EyeOff, border: "border-gray-600/60", text: "text-gray-400" },
  plot_hook: { icon: Lightbulb, border: "border-yellow-400/60", text: "text-yellow-400" },
};

function NoteNodeComponent({ data }: NoteNodeProps) {
  const noteType = data.noteType ?? "general";
  const config = noteTypeConfig[noteType];
  const Icon = config.icon;

  // For non-general types, use the type-specific colors
  // For general, keep the shared/private distinction
  const isGeneral = noteType === "general";
  const accent = isGeneral
    ? data.isShared
      ? "border-blue-400/60"
      : "border-gray-500/60"
    : config.border;
  const textColor = isGeneral
    ? data.isShared
      ? "text-blue-400"
      : "text-gray-400"
    : config.text;

  return (
    <div
      className={`px-4 py-3 rounded-lg border ${accent} bg-surface-overlay shadow-md min-w-[120px]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${textColor} flex-shrink-0`} />
        <span className={`${textColor} font-semibold text-xs truncate max-w-[120px]`}>
          {data.label}
        </span>
        {data.isShared ? (
          <Eye className="h-3 w-3 text-blue-300/60 flex-shrink-0" />
        ) : (
          <Lock className="h-3 w-3 text-gray-500/60 flex-shrink-0" />
        )}
      </div>
      {!isGeneral && (
        <div className="mt-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded bg-black/30 ${textColor}`}>
            {data.noteTypeLabel ?? noteType.replaceAll("_", " ")}
          </span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
}

export const NoteNode = memo(NoteNodeComponent);
