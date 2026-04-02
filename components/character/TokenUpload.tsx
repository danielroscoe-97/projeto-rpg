"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface TokenUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  characterName: string;
  currentTokenUrl: string | null;
  onTokenUpdated: (url: string) => void;
}

export function TokenUpload({
  open,
  onOpenChange,
  characterId,
  characterName,
  currentTokenUrl,
  onTokenUpdated,
}: TokenUploadProps) {
  const t = useTranslations("character");
  const [preview, setPreview] = useState<string | null>(currentTokenUrl);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are supported.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image must be under 2MB.");
        return;
      }

      // Upload to Supabase Storage
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${characterId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("player-avatars")
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("player-avatars").getPublicUrl(path);

        // Add cache-buster to force refresh
        const urlWithBuster = `${publicUrl}?t=${Date.now()}`;

        // Update player_characters.token_url
        const { error: updateError } = await supabase
          .from("player_characters")
          .update({ token_url: urlWithBuster })
          .eq("id", characterId);

        if (updateError) throw updateError;

        setPreview(urlWithBuster);
        onTokenUpdated(urlWithBuster);
        toast.success(t("token_updated"));
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to upload token"
        );
      } finally {
        setUploading(false);
      }
    },
    [characterId, onTokenUpdated, onOpenChange, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("upload_token")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4" data-testid="token-upload">
          {/* Preview */}
          <div className="relative">
            {preview ? (
              <img
                src={preview}
                alt={characterName}
                data-testid="token-preview"
                className="w-32 h-32 rounded-full object-cover ring-2 ring-amber-400"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-background border border-border flex items-center justify-center ring-2 ring-amber-400/20">
                <User className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Dropzone */}
          <div
            data-testid="token-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-amber-400 bg-amber-400/5"
                : "border-border hover:border-amber-400/40 hover:bg-white/[0.02]"
            }`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{t("drag_drop")}</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              JPEG, PNG, WebP (max 2MB)
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            data-testid="token-file-input"
          />

          {/* Upload button for explicit action */}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? t("upload_token") + "..." : t("upload_token")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
