"use client";

import { useTranslations } from "next-intl";
import { Trash2, Check, X, Clock } from "lucide-react";
import type { BagItem } from "@/lib/hooks/useBagOfHolding";

interface BagOfHoldingItemProps {
  item: BagItem;
  isDm: boolean;
  userId: string;
  removed?: boolean;
  onRequestRemoval: (itemId: string) => Promise<void>;
  onApproveRemoval: (requestId: string) => Promise<void>;
  onDenyRemoval: (requestId: string) => Promise<void>;
  onDmRemove: (itemId: string) => Promise<void>;
}

export function BagOfHoldingItem({
  item,
  isDm,
  userId,
  removed = false,
  onRequestRemoval,
  onApproveRemoval,
  onDenyRemoval,
  onDmRemove,
}: BagOfHoldingItemProps) {
  const t = useTranslations("player_hq.inventory");
  const isPending = item.status === "pending_removal";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        isPending
          ? "border-amber-500/30 bg-amber-500/5"
          : removed
            ? "border-border/50 bg-transparent"
            : "border-border bg-card hover:border-white/10"
      }`}
    >
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${removed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.item_name}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              x{item.quantity}
            </span>
          )}
          {isPending && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Clock className="w-3 h-3" />
              {t("pending")}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!removed && (
        <div className="flex items-center gap-1 shrink-0">
          {isPending && isDm && item.pending_request ? (
            <>
              {/* DM approval buttons */}
              <button
                type="button"
                onClick={() => onApproveRemoval(item.pending_request!.id)}
                className="w-11 h-11 flex items-center justify-center rounded-md bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors min-w-[44px] min-h-[44px]"
                aria-label={t("approve")}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDenyRemoval(item.pending_request!.id)}
                className="w-11 h-11 flex items-center justify-center rounded-md bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors min-w-[44px] min-h-[44px]"
                aria-label={t("deny")}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : isPending ? (
            <span className="text-[10px] text-amber-400/70">{t("waiting_dm")}</span>
          ) : isDm ? (
            <button
              type="button"
              onClick={() => onDmRemove(item.id)}
              className="w-11 h-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 transition-colors min-w-[44px] min-h-[44px]"
              aria-label={t("remove")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRequestRemoval(item.id)}
              className="w-11 h-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-amber-400 transition-colors min-w-[44px] min-h-[44px]"
              aria-label={t("request_removal")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
