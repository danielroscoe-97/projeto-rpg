"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResourceTracker } from "@/lib/types/database";
import { searchSrdResources, getPrefilledValues, type SrdResource } from "@/lib/data/srd-class-resources";

const RESET_OPTIONS = [
  { value: "long_rest", labelKey: "reset_long_rest" },
  { value: "short_rest", labelKey: "reset_short_rest" },
  { value: "dawn", labelKey: "reset_dawn" },
  { value: "manual", labelKey: "reset_manual" },
] as const;

interface AddResourceTrackerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: {
    name: string;
    max_uses: number;
    reset_type: ResourceTracker["reset_type"];
  }) => Promise<void>;
  editing?: ResourceTracker;
  onDelete?: () => Promise<void>;
}

export function AddResourceTrackerDialog({
  open,
  onClose,
  onAdd,
  editing,
  onDelete,
}: AddResourceTrackerDialogProps) {
  const t = useTranslations("player_hq.resources");
  const [name, setName] = useState(editing?.name ?? "");
  const [maxUses, setMaxUses] = useState(String(editing?.max_uses ?? "3"));
  const [resetType, setResetType] = useState<ResourceTracker["reset_type"]>(
    editing?.reset_type ?? "long_rest"
  );
  const [saving, setSaving] = useState(false);
  const [srdResults, setSrdResults] = useState<SrdResource[]>([]);
  const [showSrd, setShowSrd] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length >= 1 && !editing) {
      const results = searchSrdResources(value);
      setSrdResults(results);
      setShowSrd(results.length > 0);
    } else {
      setShowSrd(false);
    }
  };

  const selectSrdResource = (resource: SrdResource) => {
    setName(resource.name);
    const prefilled = getPrefilledValues(resource);
    setMaxUses(String(prefilled.maxUses));
    setResetType(prefilled.resetType);
    setShowSrd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !maxUses) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        max_uses: Math.max(1, parseInt(maxUses, 10) || 1),
        reset_type: resetType,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("edit_tracker") : t("add_tracker")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name with SRD autocomplete */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="tracker-name">{t("tracker_name")}</Label>
            <Input
              id="tracker-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => { if (name.length >= 1 && srdResults.length > 0) setShowSrd(true); }}
              onBlur={() => setTimeout(() => setShowSrd(false), 200)}
              placeholder={t("tracker_name_placeholder")}
              autoFocus
              autoComplete="off"
            />
            {/* SRD dropdown */}
            {showSrd && srdResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-[200px] overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                {srdResults.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectSrdResource(r); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-border/30 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{r.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">SRD</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.class} · {r.description.slice(0, 60)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Max uses */}
          <div className="space-y-1.5">
            <Label htmlFor="tracker-max">{t("tracker_max_uses")}</Label>
            <Input
              id="tracker-max"
              type="number"
              min={1}
              max={999}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          {/* Reset type */}
          <div className="space-y-1.5">
            <Label>{t("tracker_reset_type")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {RESET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResetType(opt.value)}
                  className={`px-3 py-2 text-xs rounded-md border transition-all ${
                    resetType === opt.value
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                      : "border-border text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {editing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="ml-auto"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={!name.trim() || saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? t("save") : t("add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
