"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FileText, Lock, Eye } from "lucide-react";

export interface NoteNodeData {
  label: string;
  isShared: boolean;
  noteId: string;
  [key: string]: unknown;
}

interface NoteNodeProps {
  data: NoteNodeData;
}

function NoteNodeComponent({ data }: NoteNodeProps) {
  const accent = data.isShared ? "border-blue-400/60" : "border-gray-500/60";
  const textColor = data.isShared ? "text-blue-400" : "text-gray-400";

  return (
    <div className={`px-4 py-3 rounded-lg border ${accent} bg-[#1a1a2e] shadow-md min-w-[120px]`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <FileText className={`h-4 w-4 ${textColor} flex-shrink-0`} />
        <span className={`${textColor} font-semibold text-xs truncate max-w-[140px]`}>
          {data.label}
        </span>
        {data.isShared ? (
          <Eye className="h-3 w-3 text-blue-300/60 flex-shrink-0" />
        ) : (
          <Lock className="h-3 w-3 text-gray-500/60 flex-shrink-0" />
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
}

export const NoteNode = memo(NoteNodeComponent);
