"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { StickyNote, Trash2 } from "lucide-react";
import type { PinColor } from "@/lib/hooks/usePlayerPins";
import { DrawerShell } from "./DrawerShell";

interface PlayerPinDrawerProps {
  pinId: string;
  initialLabel: string;
  initialNote: string;
  initialColor: PinColor;
  onUpdate: (id: string, updates: Partial<{ label: string; note: string; color: PinColor }>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const COLOR_OPTIONS: Array<{ value: PinColor; tw: string }> = [
  { value: "amber", tw: "bg-amber-400" },
  { value: "blue", tw: "bg-blue-400" },
  { value: "green", tw: "bg-emerald-400" },
  { value: "red", tw: "bg-red-400" },
  { value: "purple", tw: "bg-purple-400" },
];

export function PlayerPinDrawer({
  pinId,
  initialLabel,
  initialNote,
  initialColor,
  onUpdate,
  onDelete,
  onClose,
}: PlayerPinDrawerProps) {
  const t = useTranslations("player_hq.pin_drawer");
  const [label, setLabel] = useState(initialLabel);
  const [note, setNote] = useState(initialNote);
  const [color, setColor] = useState<PinColor>(initialColor);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const debouncedUpdate = (updates: Partial<{ label: string; note: string; color: PinColor }>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(pinId, updates);
    }, 600);
  };

  const handleLabelChange = (val: string) => {
    setLabel(val);
    debouncedUpdate({ label: val, note, color });
  };

  const handleNoteChange = (val: string) => {
    setNote(val);
    debouncedUpdate({ label, note: val, color });
  };

  const handleColorChange = (val: PinColor) => {
    setColor(val);
    onUpdate(pinId, { label, note, color: val });
  };

  const handleDelete = () => {
    onDelete(pinId);
    onClose();
  };

  return (
    <DrawerShell
      title={label || t("default_title")}
      icon={<StickyNote className="w-5 h-5" />}
      iconColor="text-amber-400"
      onClose={onClose}
    >
      {/* Label */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-2 block">
          {t("label")}
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder={t("label_placeholder")}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          maxLength={50}
        />
      </div>

      {/* Note */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-2 block">
          {t("note")}
        </label>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder={t("note_placeholder")}
          className="w-full min-h-[100px] bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-2 block">
          {t("color")}
        </label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(({ value, tw }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleColorChange(value)}
              className={`w-7 h-7 rounded-full ${tw} transition-all ${
                color === value
                  ? "ring-2 ring-offset-2 ring-offset-surface-overlay ring-white/50 scale-110"
                  : "opacity-50 hover:opacity-80"
              }`}
              aria-label={value}
              aria-pressed={color === value}
            />
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={handleDelete}
        className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors text-sm w-full"
      >
        <Trash2 className="w-4 h-4" />
        {t("delete")}
      </button>
    </DrawerShell>
  );
}
