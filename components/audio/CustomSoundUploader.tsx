"use client";

import { useState, useRef } from "react";
import { Plus, Upload, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { CustomSound } from "./CustomSoundCard";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CUSTOM_SOUNDS = 5;

const EMOJI_OPTIONS = [
  "🎵", "🔥", "⚡", "🗡️", "💀", "👻",
  "🐉", "🏰", "🌊", "🌪️", "💥", "🔔",
  "🎺", "🥁", "💎", "🛡️", "🧙", "🌙",
];

interface CustomSoundUploaderProps {
  currentCount: number;
  onUploaded: (sound: CustomSound) => void;
}

export function CustomSoundUploader({ currentCount, onUploaded }: CustomSoundUploaderProps) {
  const t = useTranslations("soundboard");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [step, setStep] = useState<"idle" | "editing">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎵");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const atLimit = currentCount >= MAX_CUSTOM_SOUNDS;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("file_too_large"));
      return;
    }

    if (!file.type.includes("audio") && !file.name.endsWith(".mp3")) {
      toast.error(t("invalid_format"));
      return;
    }

    setSelectedFile(file);
    setName(file.name.replace(/\.mp3$/i, "").slice(0, 50));
    setStep("editing");

    // Reset input for re-selection
    e.target.value = "";
  };

  const togglePreview = () => {
    if (!selectedFile) return;

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(URL.createObjectURL(selectedFile));
      audioPreviewRef.current.addEventListener("ended", () => setPreviewing(false));
    }

    if (previewing) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      setPreviewing(false);
    } else {
      audioPreviewRef.current.play().catch(() => {});
      setPreviewing(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", name.trim());
      formData.append("emoji", emoji);

      const res = await fetch("/api/dm-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }

      const { data } = await res.json();
      onUploaded(data);
      toast.success(t("upload_success"));
      resetState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setStep("idle");
    setSelectedFile(null);
    setName("");
    setEmoji("🎵");
    setPreviewing(false);
  };

  // Idle: show add button
  if (step === "idle") {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={atLimit}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed transition-all min-h-[100px] ${
            atLimit
              ? "border-white/[0.06] opacity-40 cursor-not-allowed"
              : "border-white/[0.12] hover:border-gold/30 hover:bg-gold/5 cursor-pointer"
          }`}
          title={atLimit ? t("limit_reached") : t("add_sound")}
        >
          <Plus className={`w-6 h-6 ${atLimit ? "text-muted-foreground" : "text-gold"}`} />
          <span className="text-[10px] font-medium text-muted-foreground">
            {atLimit ? t("limit_reached") : t("add_sound")}
          </span>
          <span className="text-[9px] text-muted-foreground/60">
            {currentCount}/{MAX_CUSTOM_SOUNDS}
          </span>
        </button>
      </>
    );
  }

  // Editing: show form
  return (
    <div className="col-span-full p-4 rounded-lg border border-gold/20 bg-gold/5 space-y-3">
      {/* File info + preview */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePreview}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
            previewing ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          {previewing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{selectedFile?.name}</p>
          <p className="text-xs text-muted-foreground">
            {selectedFile ? `${Math.round(selectedFile.size / 1024)}KB` : ""}
          </p>
        </div>
      </div>

      {/* Name input */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 50))}
        placeholder={t("name_placeholder")}
        className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
        autoFocus
      />

      {/* Emoji picker */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">{t("choose_icon")}</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all ${
                emoji === e
                  ? "bg-gold/20 border-2 border-gold/40 scale-110"
                  : "bg-white/[0.04] hover:bg-white/[0.08] border border-transparent"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={resetState}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-white/[0.08] text-muted-foreground hover:text-foreground transition-all min-h-[40px]"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !name.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-gold text-surface-primary hover:brightness-110 disabled:opacity-50 transition-all min-h-[40px]"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-surface-primary/30 border-t-surface-primary rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? t("uploading") : t("save")}
        </button>
      </div>
    </div>
  );
}
