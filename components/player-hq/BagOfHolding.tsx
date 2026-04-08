"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Package, Plus, Search } from "lucide-react";
import { BagOfHoldingItem } from "./BagOfHoldingItem";
import { AddItemForm } from "./AddItemForm";
import { useBagOfHolding } from "@/lib/hooks/useBagOfHolding";
import { useBagEssentials } from "@/lib/hooks/use-bag-essentials";
import { Button } from "@/components/ui/button";
import type { BagEssentials } from "@/lib/types/bag-essentials";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BagOfHoldingProps {
  campaignId: string;
  userId: string;
  isDm: boolean;
}

/* ------------------------------------------------------------------ */
/*  Essentials — numeric mini-card field                               */
/* ------------------------------------------------------------------ */

function EssentialField({
  label,
  value,
  onChange,
  readonly,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  readonly: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 transition-colors hover:border-white/[0.12]">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      {readonly ? (
        <span className="w-16 text-right font-mono font-bold text-amber-400 text-sm tabular-nums">
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
          className="w-16 text-right bg-transparent border-none text-amber-400 font-mono font-bold text-sm focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header helper                                              */
/* ------------------------------------------------------------------ */

function SectionHeader({
  emoji,
  label,
}: {
  emoji: string;
  label: string;
}) {
  return (
    <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-2">
      <span>{emoji}</span>
      {label}
    </h4>
  );
}

/* ------------------------------------------------------------------ */
/*  Essentials grid skeleton (loading state)                           */
/* ------------------------------------------------------------------ */

function EssentialsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Potions row */}
      <div>
        <div className="h-3 w-28 bg-white/5 rounded mb-2 animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-24 bg-white/5 rounded mb-2 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((j) => (
                <div key={j} className="h-10 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function BagOfHolding({
  campaignId,
  userId,
  isDm,
}: BagOfHoldingProps) {
  const t = useTranslations("player_hq.inventory");
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  /* ---- hooks ---- */
  const {
    essentials,
    loading: essentialsLoading,
    updateEssentials,
  } = useBagEssentials(campaignId);

  const {
    activeItems,
    pendingItems,
    removedItems,
    pendingCount,
    loading: itemsLoading,
    addItem,
    requestRemoval,
    approveRemoval,
    denyRemoval,
    dmRemoveItem,
  } = useBagOfHolding(campaignId, userId);

  const loading = essentialsLoading || itemsLoading;

  /* ---- essentials helpers ---- */
  const readonly = !isDm;

  const setField = useCallback(
    <K extends keyof BagEssentials>(
      section: K,
      field: K extends "goodberries" ? never : string,
      value: number,
    ) => {
      const next: BagEssentials = {
        ...essentials,
        [section]:
          typeof essentials[section] === "object"
            ? { ...(essentials[section] as Record<string, number>), [field]: value }
            : value,
      };
      updateEssentials(next);
    },
    [essentials, updateEssentials],
  );

  const setGoodberries = useCallback(
    (v: number) => {
      updateEssentials({ ...essentials, goodberries: v });
    },
    [essentials, updateEssentials],
  );

  /* ---- items filtering ---- */
  const filteredActive = activeItems.filter((item) =>
    item.item_name.toLowerCase().includes(filter.toLowerCase()),
  );
  const filteredPending = pendingItems.filter((item) =>
    item.item_name.toLowerCase().includes(filter.toLowerCase()),
  );
  const totalActive = activeItems.length + pendingItems.length;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  SECTION 1 — Essentials                                      */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("essentials.title")}
          </h3>
        </div>

        {loading ? (
          <EssentialsSkeleton />
        ) : (
          <div className="space-y-4">
            {/* ---- Healing Potions ---- */}
            <div>
              <SectionHeader emoji="🧪" label={t("essentials.potions")} />
              <div className="grid grid-cols-2 gap-2">
                <EssentialField
                  label={t("essentials.potion_small")}
                  value={essentials.potions.small}
                  onChange={(v) => setField("potions", "small", v)}
                  readonly={readonly}
                />
                <EssentialField
                  label={t("essentials.potion_greater")}
                  value={essentials.potions.greater}
                  onChange={(v) => setField("potions", "greater", v)}
                  readonly={readonly}
                />
                <EssentialField
                  label={t("essentials.potion_superior")}
                  value={essentials.potions.superior}
                  onChange={(v) => setField("potions", "superior", v)}
                  readonly={readonly}
                />
                <EssentialField
                  label={t("essentials.potion_supreme")}
                  value={essentials.potions.supreme}
                  onChange={(v) => setField("potions", "supreme", v)}
                  readonly={readonly}
                />
              </div>
            </div>

            {/* ---- Bottom two-column layout ---- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column: Consumables + Components stacked */}
              <div className="space-y-4">
                {/* Consumables */}
                <div>
                  <SectionHeader emoji="🫐" label={t("essentials.consumables")} />
                  <div className="grid grid-cols-2 gap-2">
                    <EssentialField
                      label={t("essentials.goodberries")}
                      value={essentials.goodberries}
                      onChange={setGoodberries}
                      readonly={readonly}
                    />
                  </div>
                </div>

                {/* Components */}
                <div>
                  <SectionHeader emoji="💎" label={t("essentials.components_title")} />
                  <div className="grid grid-cols-2 gap-2">
                    <EssentialField
                      label={t("essentials.diamonds")}
                      value={essentials.components.diamonds}
                      onChange={(v) => setField("components", "diamonds", v)}
                      readonly={readonly}
                    />
                    <EssentialField
                      label={t("essentials.revivify")}
                      value={essentials.components.revivify_packs}
                      onChange={(v) => setField("components", "revivify_packs", v)}
                      readonly={readonly}
                    />
                  </div>
                </div>
              </div>

              {/* Right column: Currency */}
              <div>
                <SectionHeader emoji="💰" label={t("essentials.currency")} />
                <div className="grid grid-cols-1 gap-2">
                  <EssentialField
                    label={t("essentials.gold")}
                    value={essentials.currency.gold}
                    onChange={(v) => setField("currency", "gold", v)}
                    readonly={readonly}
                  />
                  <EssentialField
                    label={t("essentials.silver")}
                    value={essentials.currency.silver}
                    onChange={(v) => setField("currency", "silver", v)}
                    readonly={readonly}
                  />
                  <EssentialField
                    label={t("essentials.platinum")}
                    value={essentials.currency.platinum}
                    onChange={(v) => setField("currency", "platinum", v)}
                    readonly={readonly}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/*  SECTION 2 — Custom Items                                    */}
      {/* ============================================================ */}
      <section>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("essentials.custom_title")}
            </h3>
            {totalActive > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                {totalActive}
              </span>
            )}
          </div>
          <Button
            variant="goldOutline"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="h-8 text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("essentials.custom_add")}
          </Button>
        </div>

        {/* Search */}
        {totalActive > 5 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Pending removals (DM sees these prominently) */}
            {filteredPending.length > 0 && (
              <div className="space-y-1 mb-3">
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  {t("pending_removals")}
                  <span className="bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px]">
                    {pendingCount}
                  </span>
                </h4>
                <div className="space-y-1">
                  {filteredPending.map((item) => (
                    <BagOfHoldingItem
                      key={item.id}
                      item={item}
                      isDm={isDm}
                      userId={userId}
                      onRequestRemoval={requestRemoval}
                      onApproveRemoval={approveRemoval}
                      onDenyRemoval={denyRemoval}
                      onDmRemove={dmRemoveItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active items */}
            {filteredActive.length > 0 ? (
              <div className="space-y-1">
                {filteredActive.map((item) => (
                  <BagOfHoldingItem
                    key={item.id}
                    item={item}
                    isDm={isDm}
                    userId={userId}
                    onRequestRemoval={requestRemoval}
                    onApproveRemoval={approveRemoval}
                    onDenyRemoval={denyRemoval}
                    onDmRemove={dmRemoveItem}
                  />
                ))}
              </div>
            ) : totalActive === 0 ? (
              <div className="py-6 text-center">
                <Package className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("empty_state")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="mt-2 text-xs text-amber-400 hover:text-amber-300 min-h-[44px]"
                >
                  {t("add_first")}
                </button>
              </div>
            ) : null}

            {/* Removed items (collapsible) */}
            {removedItems.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowRemoved((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                >
                  {showRemoved
                    ? t("hide_removed")
                    : t("show_removed", { count: removedItems.length })}
                </button>
                {showRemoved && (
                  <div className="mt-2 space-y-1">
                    {removedItems.map((item) => (
                      <BagOfHoldingItem
                        key={item.id}
                        item={item}
                        isDm={isDm}
                        userId={userId}
                        onRequestRemoval={requestRemoval}
                        onApproveRemoval={approveRemoval}
                        onDenyRemoval={denyRemoval}
                        onDmRemove={dmRemoveItem}
                        removed
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Add item form (dialog) */}
        {showAdd && (
          <AddItemForm
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onAdd={async (input) => {
              await addItem(input);
              setShowAdd(false);
            }}
          />
        )}
      </section>
    </div>
  );
}
