"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotatingPlaceholder } from "./RotatingPlaceholder";
import { parseMonsterData } from "@/lib/import/import-parser";
import { saveImportedMonsters } from "@/lib/import/import-cache";
import { mergeImportedMonsters } from "@/lib/srd/srd-search";
import { toast } from "sonner";

const PLACEHOLDER_URLS = [
  "Ex: https://5e.tools/data/bestiary/",
  "Ex: https://open5e.com/api/monsters/",
  "Ex: https://dnd5e.wikidot.com/monsters",
  "Ex: https://roll20.net/compendium/dnd5e/",
  "Ex: https://www.dndbeyond.com/monsters",
  "Ex: https://5esrd.com/database/creature/",
];

interface ImportContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportContentModal({ open, onOpenChange }: ImportContentModalProps) {
  const t = useTranslations("import");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (json: unknown, sourceLabel: string, sourceUrl?: string) => {
    const result = parseMonsterData(json);
    if (!result.success) {
      if (result.error === "FORMAT_UNKNOWN") {
        toast.error(t("modal_error_format"));
      } else {
        toast.error(t("modal_error_parse"));
      }
      return;
    }

    await saveImportedMonsters(sourceLabel, result.monsters, sourceUrl);
    mergeImportedMonsters(result.monsters);

    toast.success(t("modal_success", { count: result.monsters.length }));
    if (result.warnings.length > 0) {
      toast.warning(`${result.warnings.length} entries skipped`);
    }

    setUrl("");
    onOpenChange(false);
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setImporting(true);
    setProgress(20);

    try {
      const res = await fetch(url.trim());
      setProgress(60);

      if (!res.ok) {
        toast.error(t("modal_error_fetch", { error: `HTTP ${res.status}` }));
        return;
      }

      const json = await res.json();
      setProgress(80);

      const label = new URL(url.trim()).hostname + "-" + new Date().toISOString().slice(0, 10);
      await handleImport(json, label, url.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("CORS")) {
        toast.error(t("modal_error_cors"));
      } else {
        toast.error(t("modal_error_fetch", { error: message }));
      }
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setProgress(30);

    try {
      const text = await file.text();
      setProgress(60);
      const json = JSON.parse(text);
      setProgress(80);
      const label = file.name.replace(/\.json$/i, "") + "-" + new Date().toISOString().slice(0, 10);
      await handleImport(json, label);
    } catch {
      toast.error(t("modal_error_parse"));
    } finally {
      setImporting(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("modal_title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL input */}
          <div>
            <label className="text-xs text-muted-foreground/70 mb-1.5 block">
              {t("modal_url_label")}
            </label>
            <RotatingPlaceholder
              placeholders={PLACEHOLDER_URLS}
              value={url}
              onChange={setUrl}
            />
          </div>

          <button
            type="button"
            onClick={handleUrlImport}
            disabled={importing || !url.trim()}
            className="w-full py-2 rounded-md text-sm font-medium transition-all bg-gold text-surface-primary hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? t("modal_importing") : t("modal_import")}
          </button>

          {/* Progress bar */}
          {importing && progress > 0 && (
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-white/[0.06]" />
            <span className="text-xs text-muted-foreground/50">{t("modal_or")}</span>
            <div className="flex-1 border-t border-white/[0.06]" />
          </div>

          {/* File upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-sm font-medium border border-border text-foreground/80 hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <span>📁</span>
              {t("modal_upload")}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
