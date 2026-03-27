"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { FileImage, FileText, Trash2, ExternalLink } from "lucide-react";

interface SharedFile {
  id: string;
  file_name: string;
  file_type: "image" | "pdf";
  file_path: string;
  file_size_bytes: number;
  created_at: string;
}

interface SharedFileCardProps {
  file: SharedFile;
  /** If true, shows remove button (DM view) */
  canRemove?: boolean;
  onRemove?: (fileId: string) => void;
}

export function SharedFileCard({ file, canRemove, onRemove }: SharedFileCardProps) {
  const t = useTranslations("session");
  const [isViewing, setIsViewing] = useState(false);

  const handleView = useCallback(async () => {
    setIsViewing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("session-files")
        .createSignedUrl(file.file_path, 3600); // 1h expiry
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast.error(t("files_view_error"));
      captureError(err, { component: "SharedFileCard", action: "viewFile", category: "network" });
    } finally {
      setIsViewing(false);
    }
  }, [file.file_path, t]);

  const handleRemove = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${file.file_path.split("/")[0]}/files?fileId=${file.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      onRemove?.(file.id);
    } catch (err) {
      toast.error(t("files_remove_error"));
      captureError(err, { component: "SharedFileCard", action: "removeFile", category: "database" });
    }
  }, [file.id, file.file_path, onRemove, t]);

  const icon = file.file_type === "image"
    ? <FileImage className="w-5 h-5 text-blue-400" />
    : <FileText className="w-5 h-5 text-red-400" />;

  const sizeKb = Math.round(file.file_size_bytes / 1024);

  return (
    <div
      className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2"
      data-testid={`shared-file-${file.id}`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm truncate">{file.file_name}</p>
        <p className="text-muted-foreground text-xs">{sizeKb} KB</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleView}
          disabled={isViewing}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gold hover:text-gold/80 transition-colors min-h-[36px]"
          data-testid={`view-file-${file.id}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("files_view")}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors min-h-[36px]"
            data-testid={`remove-file-${file.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
