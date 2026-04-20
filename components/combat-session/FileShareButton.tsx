"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { Upload, Loader2 } from "lucide-react";

import { SharedFileCard } from "./SharedFileCard";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024;

interface SharedFile {
  id: string;
  file_name: string;
  file_type: "image" | "pdf";
  file_path: string;
  file_size_bytes: number;
  created_at: string;
}

interface FileShareButtonProps {
  sessionId: string;
}

export function FileShareButton({ sessionId }: FileShareButtonProps) {
  const t = useTranslations("session");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size validation
    if (file.size > MAX_SIZE) {
      toast.error(t("files_error_size"));
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setShowFiles(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress for UX (real progress requires XMLHttpRequest)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 90));
      }, 200);

      const res = await fetch(`/api/combat/${sessionId}/files`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Upload failed");
      }

      setProgress(100);
      const { data: fileRecord } = await res.json();

      const newFile: SharedFile = { ...fileRecord };
      setFiles((prev) => [...prev, newFile]);

      // Note: no combat broadcast needed for file sharing —
      // players load shared files from DB on page load/refresh
      toast.success(t("files_uploaded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg.includes("Invalid file type")) {
        toast.error(t("files_error_type"));
      } else if (msg.includes("File too large")) {
        toast.error(t("files_error_size"));
      } else {
        toast.error(t("files_upload_error"));
      }
      captureError(err, { component: "FileShareButton", action: "uploadFile", category: "network" });
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [sessionId, t]);

  const handleRemove = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="file-upload-input"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.04] min-h-[44px]"
        data-testid="file-share-button"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{t("files_upload")}</span>
      </button>

      {/* Progress bar */}
      {isUploading && (
        <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* File list */}
      {showFiles && files.length > 0 && (
        <div className="mt-2 space-y-2">
          {files.map((file) => (
            <SharedFileCard
              key={file.id}
              file={file}
              canRemove
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
