"use client";

import { useState, useRef } from "react";
import { Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface CustomSound {
  id: string;
  name: string;
  emoji: string;
  file_url: string;
  file_size: number;
  duration_ms: number | null;
  created_at: string;
}

interface CustomSoundCardProps {
  sound: CustomSound;
  onDelete: (id: string) => void;
}

export function CustomSoundCard({ sound, onDelete }: CustomSoundCardProps) {
  const t = useTranslations("soundboard");
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(sound.file_url);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
    }

    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.error(t("play_error"));
      });
      setPlaying(true);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/dm-audio?id=${sound.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      onDelete(sound.id);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("delete_error"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const fileSizeKb = Math.round(sound.file_size / 1024);

  return (
    <div className="group relative flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/[0.06] border border-transparent hover:border-white/[0.12] transition-all">
      {/* Emoji */}
      <span className="text-2xl leading-none">{sound.emoji}</span>

      {/* Name */}
      <span className="text-[11px] font-medium text-foreground text-center truncate w-full">
        {sound.name}
      </span>

      {/* Size */}
      <span className="text-[9px] text-muted-foreground">{fileSizeKb}KB</span>

      {/* Play/Stop */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all min-h-[28px] ${
          playing
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
        }`}
      >
        {playing ? (
          <>
            <Square className="w-3 h-3" />
            {t("stop")}
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            {t("play")}
          </>
        )}
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={`absolute top-1 right-1 p-1 rounded transition-all ${
          confirmDelete
            ? "text-red-400 bg-red-400/10 opacity-100"
            : "text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-red-400"
        }`}
        title={confirmDelete ? t("confirm_delete") : t("delete")}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
