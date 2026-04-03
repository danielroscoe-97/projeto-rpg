"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { ResourceTrackerRow } from "./ResourceTrackerRow";
import { AddResourceTrackerDialog } from "./AddResourceTrackerDialog";
import type { ResourceTracker } from "@/lib/types/database";

interface ResourceTrackerListProps {
  trackers: ResourceTracker[];
  loading: boolean;
  readOnly?: boolean;
  onToggleDot: (trackerId: string, dotIndex: number) => void;
  onResetTracker: (id: string) => void;
  onAddTracker: (input: {
    name: string;
    max_uses: number;
    reset_type: ResourceTracker["reset_type"];
  }) => Promise<{ data: ResourceTracker | null; error: unknown }>;
  onUpdateTracker: (id: string, updates: Partial<ResourceTracker>) => Promise<void>;
  onDeleteTracker: (id: string) => Promise<void>;
}

export function ResourceTrackerList({
  trackers,
  loading,
  readOnly = false,
  onToggleDot,
  onResetTracker,
  onAddTracker,
  onUpdateTracker,
  onDeleteTracker,
}: ResourceTrackerListProps) {
  const t = useTranslations("player_hq.resources");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-white/5 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("trackers_title")}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("add_tracker")}
          </button>
        )}
      </div>

      {/* Tracker rows */}
      {trackers.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">{t("empty_state")}</p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300"
            >
              {t("add_first")}
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {trackers.map((tracker) => (
            <ResourceTrackerRow
              key={tracker.id}
              name={tracker.name}
              currentUses={tracker.current_uses}
              maxUses={tracker.max_uses}
              resetType={tracker.reset_type}
              readOnly={readOnly}
              onToggle={(idx) => onToggleDot(tracker.id, idx)}
              onReset={() => onResetTracker(tracker.id)}
              onEdit={() => setEditingId(tracker.id)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      {showAdd && (
        <AddResourceTrackerDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={async (input) => {
            await onAddTracker(input);
            setShowAdd(false);
          }}
        />
      )}

      {/* Edit dialog — M-08 fix: key forces remount on tracker change */}
      {editingId && (
        <AddResourceTrackerDialog
          key={editingId}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          editing={trackers.find((t) => t.id === editingId)}
          onAdd={async (input) => {
            await onUpdateTracker(editingId, input);
            setEditingId(null);
          }}
          onDelete={async () => {
            await onDeleteTracker(editingId);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
