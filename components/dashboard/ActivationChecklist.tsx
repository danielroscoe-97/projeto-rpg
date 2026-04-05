"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  X,
  Swords,
  UserPlus,
  Crown,
  ScrollText,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistStatus {
  hasAccount: boolean;
  hasRunCombat: boolean;
  hasInvitedPlayer: boolean;
  hasUsedLegendary: boolean;
  hasViewedRecap: boolean;
}

interface ChecklistTranslations {
  title: string;
  progress: string;
  dismiss: string;
  item_account: string;
  item_combat: string;
  item_invite: string;
  item_legendary: string;
  item_recap: string;
  all_complete: string;
}

interface ActivationChecklistProps {
  status: ChecklistStatus;
  translations: ChecklistTranslations;
}

const CHECKLIST_DISMISSED_KEY = "pocketdm_checklist_dismissed";

interface ChecklistItem {
  key: keyof ChecklistStatus;
  labelKey: keyof ChecklistTranslations;
  icon: typeof Swords;
  href: string;
}

const ITEMS: ChecklistItem[] = [
  { key: "hasAccount", labelKey: "item_account", icon: UserCheck, href: "/app/dashboard" },
  { key: "hasRunCombat", labelKey: "item_combat", icon: Swords, href: "/app/session/new" },
  { key: "hasInvitedPlayer", labelKey: "item_invite", icon: UserPlus, href: "/app/dashboard/campaigns" },
  { key: "hasUsedLegendary", labelKey: "item_legendary", icon: Crown, href: "/app/session/new" },
  { key: "hasViewedRecap", labelKey: "item_recap", icon: ScrollText, href: "/app/dashboard/combats" },
];

export function ActivationChecklist({ status, translations: t }: ActivationChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden, check localStorage

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const completedCount = ITEMS.filter((item) => status[item.key]).length;
  const allComplete = completedCount === ITEMS.length;
  const visible = !dismissed && !allComplete;

  const progress = (completedCount / ITEMS.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
      <motion.div
        key="activation-checklist"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 rounded-xl border border-white/[0.08] bg-card p-4 sm:p-5"
        data-testid="activation-checklist"
        data-tour-id="dash-checklist"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {t.progress.replace("{done}", String(completedCount)).replace("{total}", String(ITEMS.length))}
            </span>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                try { localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true"); } catch { /* noop */ }
              }}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-0.5 rounded"
              aria-label={t.dismiss}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Checklist items */}
        <ul className="space-y-1">
          {ITEMS.map((item) => {
            const done = status[item.key];
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={done ? "#" : item.href}
                  onClick={done ? (e) => e.preventDefault() : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                    done
                      ? "text-muted-foreground/50 cursor-default"
                      : "text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="w-[18px] h-[18px] text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-[18px] h-[18px] text-muted-foreground/30 shrink-0 group-hover:text-amber-400/50 transition-colors" />
                  )}
                  <Icon className={cn("w-4 h-4 shrink-0", done ? "text-muted-foreground/30" : "text-amber-400/70")} aria-hidden="true" />
                  <span className={cn(done && "line-through")}>{t[item.labelKey]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
