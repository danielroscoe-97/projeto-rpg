"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, Unlink, Plus, Gem } from "lucide-react";
import { usePersonalInventory } from "@/lib/hooks/usePersonalInventory";
import type { CharacterInventoryItem } from "@/lib/types/database";

const MAX_ATTUNEMENT = 3;

const RARITY_COLORS: Record<string, string> = {
  common: "text-zinc-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  "very rare": "text-purple-400",
  legendary: "text-amber-400",
  artifact: "text-red-400",
};

interface AttunementSectionProps {
  characterId: string;
  readOnly?: boolean;
}

export function AttunementSection({
  characterId,
  readOnly = false,
}: AttunementSectionProps) {
  const t = useTranslations("player_hq.personal");
  const [showPicker, setShowPicker] = useState(false);

  const { items, attuned, loading, toggleAttune, addItemFull } =
    usePersonalInventory(characterId);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-28 bg-white/5 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Items eligible for attunement (magic items not already attuned)
  const eligibleItems = items.filter((i) => !i.is_attuned && i.is_magic);
  const emptySlots = MAX_ATTUNEMENT - attuned.length;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Gem className="w-3.5 h-3.5" />
          {t("attunement_title")}
        </h4>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {t("attunement_slots", { used: attuned.length, max: MAX_ATTUNEMENT })}
        </span>
      </div>

      {/* Attunement slots */}
      <div className="space-y-1.5">
        {/* Filled slots */}
        {attuned.map((item) => (
          <AttunedItemRow
            key={item.id}
            item={item}
            readOnly={readOnly}
            onUnattune={() => toggleAttune(item.id)}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/[0.06]"
          >
            <div className="w-5 h-5 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/40">◇</span>
            </div>
            <span className="flex-1 text-xs text-muted-foreground/40 italic">
              {t("empty_attune_slot")}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 transition-colors min-w-[44px] min-h-[44px] justify-center"
              >
                <Plus className="w-3 h-3" />
                {t("attune")}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Inline picker */}
      {showPicker && (
        <AttunementPicker
          eligibleItems={eligibleItems}
          onSelect={async (id) => {
            await toggleAttune(id);
            setShowPicker(false);
          }}
          onAddCustom={async (name) => {
            await addItemFull({
              item_name: name,
              is_magic: true,
              is_attuned: true,
            });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/* ── Attuned item row ─────────────────────────────────────────────── */

function AttunedItemRow({
  item,
  readOnly,
  onUnattune,
}: {
  item: CharacterInventoryItem;
  readOnly: boolean;
  onUnattune: () => void;
}) {
  const t = useTranslations("player_hq.personal");
  const rarityColor = item.rarity
    ? RARITY_COLORS[item.rarity.toLowerCase()] ?? "text-muted-foreground"
    : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-400/[0.04] border border-amber-400/10">
      <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate block">
          {item.item_name}
        </span>
        {(item.rarity || item.attune_notes) && (
          <span className={`text-[11px] ${rarityColor} truncate block`}>
            {item.rarity && item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
            {item.rarity && item.attune_notes && " · "}
            {item.attune_notes}
          </span>
        )}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onUnattune}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] justify-center"
          title={t("unattune")}
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Attunement picker (inline) ───────────────────────────────────── */

function AttunementPicker({
  eligibleItems,
  onSelect,
  onAddCustom,
  onClose,
}: {
  eligibleItems: CharacterInventoryItem[];
  onSelect: (id: string) => void;
  onAddCustom: (name: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("player_hq.personal");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="mt-2 bg-popover border border-border rounded-lg overflow-hidden">
      {/* Eligible items from inventory */}
      {eligibleItems.length > 0 && (
        <div className="max-h-[160px] overflow-y-auto">
          {eligibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-border/30 last:border-b-0"
            >
              <span className="text-sm text-foreground">{item.item_name}</span>
              {item.rarity && (
                <span
                  className={`ml-2 text-[10px] ${RARITY_COLORS[item.rarity.toLowerCase()] ?? "text-muted-foreground"}`}
                >
                  {item.rarity}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add custom */}
      {showCustom ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customName.trim()) onAddCustom(customName.trim());
          }}
          className="flex items-center gap-2 px-3 py-2 border-t border-border/30"
        >
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t("item_name_placeholder")}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customName.trim()}
            className="text-xs text-amber-400 disabled:text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {t("attune")}
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/30">
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            + Add custom item
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
