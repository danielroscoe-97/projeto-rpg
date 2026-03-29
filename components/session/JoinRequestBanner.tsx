"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Shield, Swords, Heart, X, Check } from "lucide-react";

export interface JoinRequest {
  request_id: string;
  player_name: string;
  hp: number | null;
  ac: number | null;
  initiative: number;
}

interface JoinRequestBannerProps {
  requests: JoinRequest[];
  onAccept: (request: JoinRequest) => void;
  onReject: (request: JoinRequest) => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

function JoinRequestCard({
  request,
  onAccept,
  onReject,
}: {
  request: JoinRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useTranslations("common");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 justify-between"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Shield className="w-4 h-4 text-gold shrink-0" />
        <span className="font-medium text-foreground truncate">
          {request.player_name}
        </span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {request.hp ?? "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {request.ac ?? "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Swords className="w-3 h-3" />
            {request.initiative}
          </span>
        </div>
        {/* Mobile: show compact stats */}
        <div className="flex sm:hidden items-center gap-2 text-xs text-muted-foreground">
          <span>{t("late_join_init_short", { value: request.initiative })}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReject}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all duration-200 min-h-[36px] inline-flex items-center gap-1.5"
          aria-label={`${t("late_join_reject")} ${request.player_name}`}
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("late_join_reject")}</span>
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-gold text-background hover:bg-gold/80 transition-all duration-200 min-h-[36px] inline-flex items-center gap-1.5"
          aria-label={`${t("late_join_accept")} ${request.player_name}`}
        >
          <Check className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("late_join_accept")}</span>
        </button>
      </div>
    </motion.div>
  );
}

export function JoinRequestBanner({
  requests,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: JoinRequestBannerProps) {
  const t = useTranslations("common");
  const count = requests.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className="rounded-lg border border-gold/40 bg-gold/[0.06] p-3 sm:p-4 space-y-3"
            role="alert"
            aria-live="polite"
            data-testid="join-request-banner"
          >
            {/* Header */}
            <div className="flex items-center gap-2 text-gold">
              <Swords className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-semibold">
                {count === 1
                  ? t("late_join_banner_title_one")
                  : t("late_join_banner_title_many", { count })}
              </span>
            </div>

            {/* Request list */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {requests.map((req) => (
                  <JoinRequestCard
                    key={req.request_id}
                    request={req}
                    onAccept={() => onAccept(req)}
                    onReject={() => onReject(req)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Bulk actions for multiple requests */}
            {count > 1 && (
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gold/20">
                {onRejectAll && (
                  <button
                    type="button"
                    onClick={onRejectAll}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all duration-200 min-h-[32px]"
                  >
                    {t("late_join_reject_all")}
                  </button>
                )}
                {onAcceptAll && (
                  <button
                    type="button"
                    onClick={onAcceptAll}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-background hover:bg-gold/80 transition-all duration-200 min-h-[32px]"
                  >
                    {t("late_join_accept_all")}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
