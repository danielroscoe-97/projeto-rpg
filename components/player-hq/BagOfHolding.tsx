"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Plus, Search } from "lucide-react";
import { BagOfHoldingItem } from "./BagOfHoldingItem";
import { AddItemForm } from "./AddItemForm";
import { useBagOfHolding } from "@/lib/hooks/useBagOfHolding";

interface BagOfHoldingProps {
  campaignId: string;
  userId: string;
  isDm: boolean;
}

export function BagOfHolding({
  campaignId,
  userId,
  isDm,
}: BagOfHoldingProps) {
  const t = useTranslations("player_hq.inventory");
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  const {
    activeItems,
    pendingItems,
    removedItems,
    pendingCount,
    loading,
    addItem,
    requestRemoval,
    approveRemoval,
    denyRemoval,
    dmRemoveItem,
  } = useBagOfHolding(campaignId, userId);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-white/5 rounded-lg" />
        ))}
      </div>
    );
  }

  const filteredActive = activeItems.filter((item) =>
    item.item_name.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredPending = pendingItems.filter((item) =>
    item.item_name.toLowerCase().includes(filter.toLowerCase())
  );

  const totalActive = activeItems.length + pendingItems.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("title")}
          </h3>
          <span className="text-xs text-muted-foreground">({totalActive})</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors min-h-[44px]"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("add_item")}
        </button>
      </div>

      {/* Search */}
      {totalActive > 5 && (
        <div className="relative">
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

      {/* Pending removals (DM sees these prominently) */}
      {filteredPending.length > 0 && (
        <div className="space-y-1">
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
        <div className="py-8 text-center">
          <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("empty_state")}</p>
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
        <div>
          <button
            type="button"
            onClick={() => setShowRemoved((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
          >
            {showRemoved ? t("hide_removed") : t("show_removed", { count: removedItems.length })}
          </button>
          {showRemoved && (
            <div className="mt-2 space-y-1 opacity-50">
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

      {/* Add item form */}
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
    </div>
  );
}
