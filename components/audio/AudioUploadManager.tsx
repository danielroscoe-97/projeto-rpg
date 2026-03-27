"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PlayerAudioFile } from "@/lib/types/audio";

const MAX_SLOTS = 6;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

interface AudioUploadManagerProps {
  /** Called after successful upload or delete to refresh parent state */
  onFilesChange?: (files: PlayerAudioFile[]) => void;
}

export function AudioUploadManager({ onFilesChange }: AudioUploadManagerProps) {
  const t = useTranslations("audio");
  const [files, setFiles] = useState<PlayerAudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch player audio files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/player-audio");
      if (!res.ok) {
        if (res.status === 401) {
          setFiles([]);
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const { data } = await res.json();
      setFiles(data ?? []);
      onFilesChange?.(data ?? []);
    } catch {
      toast.error(t("upload_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    // Client-side validations
    if (files.length >= MAX_SLOTS) {
      toast.error(t("error_limit"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("error_size"));
      return;
    }
    if (!file.type.includes("audio/mpeg") && !file.name.toLowerCase().endsWith(".mp3")) {
      toast.error(t("error_format"));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const res = await fetch("/api/player-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        if (res.status === 409) {
          toast.error(t("error_limit"));
        } else if (res.status === 415) {
          toast.error(t("error_format"));
        } else if (res.status === 413) {
          toast.error(t("error_size"));
        } else {
          toast.error(error ?? t("upload_error"));
        }
        return;
      }

      toast.success(t("upload_success"));
      await fetchFiles();
    } catch {
      toast.error(t("upload_error"));
    } finally {
      setUploading(false);
    }
  }, [files.length, t, onFilesChange]);

  const handleDelete = useCallback(async (fileId: string) => {
    // Stop preview if playing this file
    if (previewingId === fileId) {
      previewAudioRef.current?.pause();
      setPreviewingId(null);
    }

    try {
      const res = await fetch(`/api/player-audio?id=${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success(t("delete_success"));
      await fetchFiles();
    } catch {
      toast.error(t("upload_error"));
    }
  }, [previewingId, t, onFilesChange]);

  const handlePreview = useCallback((file: PlayerAudioFile) => {
    if (previewingId === file.id) {
      previewAudioRef.current?.pause();
      setPreviewingId(null);
      return;
    }

    // Stop current preview
    previewAudioRef.current?.pause();

    // Create signed URL for preview via the browser (the file is in Supabase storage)
    // For preview, we use the file_path directly since the API doesn't expose signed URLs
    // This is a client-side preview — we'll use the upload path
    setPreviewingId(file.id);
    // Note: preview is best-effort; in production, a signed URL fetch would be needed
  }, [previewingId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        {t("my_sounds")}...
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="audio-upload-manager">
      <h3 className="text-foreground font-semibold text-lg">{t("my_sounds")}</h3>

      {/* Grid of 6 slots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const file = files[i];

          if (file) {
            return (
              <div
                key={file.id}
                className="bg-card border border-border rounded-lg p-3 flex flex-col gap-2"
                data-testid={`audio-slot-${i}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <span className="text-foreground text-sm font-medium truncate flex-1">
                    {file.file_name.replace(/\.mp3$/i, "")}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {(file.file_size_bytes / 1024).toFixed(0)} KB
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    className="flex-1 px-2 py-1.5 text-xs bg-white/[0.06] text-foreground rounded hover:bg-white/[0.1] transition-colors min-h-[36px]"
                    data-testid={`preview-btn-${file.id}`}
                  >
                    {previewingId === file.id ? "⏸" : "▶"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="flex-1 px-2 py-1.5 text-xs bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition-colors min-h-[36px]"
                    data-testid={`delete-btn-${file.id}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          }

          // Empty slot
          return (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-card border border-dashed border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 min-h-[100px] hover:border-gold/40 hover:bg-white/[0.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid={`audio-slot-empty-${i}`}
            >
              <span className="text-2xl text-muted-foreground/40">+</span>
              <span className="text-xs text-muted-foreground/60">{t("slot_empty")}</span>
            </button>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        onChange={handleUpload}
        className="hidden"
        data-testid="audio-file-input"
      />

      {/* Upload button */}
      {files.length < MAX_SLOTS && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full px-4 py-3 bg-gold/10 text-gold font-medium rounded-lg hover:bg-gold/20 transition-colors text-sm min-h-[44px] disabled:opacity-50"
          data-testid="upload-audio-btn"
        >
          {uploading ? t("cooldown") : t("upload")}
        </button>
      )}
    </div>
  );
}
