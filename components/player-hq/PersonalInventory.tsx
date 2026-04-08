"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Sword,
  Backpack,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
} from "lucide-react";
import { usePersonalInventory } from "@/lib/hooks/usePersonalInventory";
import { usePersonalCurrency } from "@/lib/hooks/usePersonalCurrency";
import type { CharacterInventoryItem } from "@/lib/types/database";
import type { Currency } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PersonalInventoryProps {
  characterId: string;
  readOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Currency coin field                                                */
/* ------------------------------------------------------------------ */

const COIN_COLORS: Record<keyof Currency, string> = {
  cp: "bg-amber-800 text-amber-200",
  sp: "bg-slate-400 text-slate-900",
  ep: "bg-blue-300 text-blue-900",
  gp: "bg-amber-400 text-amber-900",
  pp: "bg-slate-200 text-slate-800",
};

function CoinField({
  coin,
  label,
  value,
  onChange,
  readOnly,
  highlight,
}: {
  coin: keyof Currency;
  label: string;
  value: number;
  onChange: (v: number) => void;
  readOnly: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${highlight ? "flex-[1.3]" : "flex-1"}`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${COIN_COLORS[coin]} ${highlight ? "ring-1 ring-amber-400/40" : ""}`}
      >
        {label}
      </div>
      {readOnly ? (
        <span className="text-sm font-mono font-bold text-foreground tabular-nums text-center w-full">
          {value}
        </span>
      ) : (
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            onChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
          }}
          className={`w-full text-center bg-transparent border-none text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${highlight ? "text-amber-400" : ""}`}
          aria-label={label}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Personal item card                                                 */
/* ------------------------------------------------------------------ */

function PersonalItemCard({
  item,
  readOnly,
  onToggleEquip,
  onRemove,
}: {
  item: CharacterInventoryItem;
  readOnly: boolean;
  onToggleEquip: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("player_hq.personal");
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-card border rounded-xl transition-colors ${
        item.equipped
          ? "border-l-2 border-l-amber-400 border-t-border border-r-border border-b-border"
          : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Expand toggle if has notes */}
        {item.notes ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Item info */}
        <button
          type="button"
          onClick={() => item.notes && setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {item.item_name}
            </span>
            {item.quantity > 1 && (
              <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                x{item.quantity}
              </span>
            )}
          </div>
        </button>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Equip toggle */}
            <button
              type="button"
              onClick={() => onToggleEquip(item.id)}
              className={`w-11 h-11 flex items-center justify-center rounded-md transition-colors min-w-[44px] min-h-[44px] ${
                item.equipped
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.equipped ? t("unequip") : t("equip")}
              title={item.equipped ? t("unequip") : t("equip")}
            >
              {item.equipped ? (
                <Sword className="w-4 h-4" />
              ) : (
                <Backpack className="w-4 h-4" />
              )}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="w-11 h-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 transition-colors min-w-[44px] min-h-[44px]"
              aria-label={t("remove_item")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded notes */}
      {expanded && item.notes && (
        <div className="px-3 pb-2.5 pt-0 pl-10">
          <p className="text-xs text-muted-foreground">{item.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline add item form                                               */
/* ------------------------------------------------------------------ */

function InlineAddItem({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, quantity: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("player_hq.personal");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), Math.max(1, parseInt(quantity, 10) || 1));
    setName("");
    setQuantity("1");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("item_name_placeholder")}
        autoFocus
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-12 text-center bg-white/[0.04] border border-white/[0.08] rounded-md text-sm font-mono text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-amber-400 hover:text-amber-300 disabled:text-muted-foreground disabled:opacity-40 transition-colors"
        aria-label={t("add_item")}
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors text-xs"
      >
        &times;
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Section label (gold)                                               */
/* ------------------------------------------------------------------ */

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
      {children}
    </h4>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function PersonalInventorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Currency skeleton */}
      <div>
        <div className="h-3 w-24 bg-white/5 rounded mb-3" />
        <div className="flex gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="w-7 h-7 rounded-full bg-white/5" />
              <div className="h-4 w-8 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Items skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-white/5 rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function PersonalInventory({
  characterId,
  readOnly = false,
}: PersonalInventoryProps) {
  const t = useTranslations("player_hq.personal");
  const [showAdd, setShowAdd] = useState(false);

  const {
    equipped,
    backpack,
    loading: itemsLoading,
    addItem,
    removeItem,
    toggleEquip,
  } = usePersonalInventory(characterId);

  const {
    currency,
    loading: currencyLoading,
    updateCurrency,
  } = usePersonalCurrency(characterId);

  const loading = itemsLoading || currencyLoading;

  const handleAddItem = useCallback(
    async (name: string, quantity: number) => {
      await addItem(name, quantity);
    },
    [addItem],
  );

  if (loading) {
    return <PersonalInventorySkeleton />;
  }

  const hasEquipped = equipped.length > 0;
  const hasBackpack = backpack.length > 0;
  const hasItems = hasEquipped || hasBackpack;

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  SECTION — Title                                              */}
      {/* ============================================================ */}
      <GoldLabel>{t("personal_items")}</GoldLabel>

      {/* ============================================================ */}
      {/*  SECTION — Currency grid                                      */}
      {/* ============================================================ */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
        <div className="flex gap-2 justify-center">
          {(["cp", "sp", "ep", "gp", "pp"] as const).map((coin) => (
            <CoinField
              key={coin}
              coin={coin}
              label={t(`currency_${coin}`)}
              value={currency[coin]}
              onChange={(v) => updateCurrency({ [coin]: v })}
              readOnly={readOnly}
              highlight={coin === "gp"}
            />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION — Equipped items                                     */}
      {/* ============================================================ */}
      {hasEquipped && (
        <div>
          <GoldLabel>{t("equipped_label")}</GoldLabel>
          <div className="space-y-1.5">
            {equipped.map((item) => (
              <PersonalItemCard
                key={item.id}
                item={item}
                readOnly={readOnly}
                onToggleEquip={toggleEquip}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION — Backpack items                                     */}
      {/* ============================================================ */}
      {hasBackpack && (
        <div>
          <GoldLabel>{t("backpack_label")}</GoldLabel>
          <div className="space-y-1.5">
            {backpack.map((item) => (
              <PersonalItemCard
                key={item.id}
                item={item}
                readOnly={readOnly}
                onToggleEquip={toggleEquip}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Empty state                                                  */}
      {/* ============================================================ */}
      {!hasItems && !showAdd && (
        <div className="py-4 text-center">
          <Package className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-sm text-muted-foreground">
            {t("no_personal_items")}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Add item                                                     */}
      {/* ============================================================ */}
      {!readOnly && (
        <>
          {showAdd ? (
            <InlineAddItem
              onAdd={(name, qty) => {
                handleAddItem(name, qty);
                setShowAdd(false);
              }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-dashed border-white/[0.08] text-sm text-muted-foreground hover:text-amber-400 hover:border-amber-400/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("add_item")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
