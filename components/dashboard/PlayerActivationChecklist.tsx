"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  X,
  UserCheck,
  Users,
  Swords,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlayerChecklistStatus {
  hasAccount: boolean;
  hasCampaign: boolean;
  hasCharacter: boolean;
  hasAttendedSession: boolean;
}

interface PlayerChecklistTranslations {
  title: string;
  progress: string;
  dismiss: string;
  item_account: string;
  item_campaign: string;
  item_character: string;
  item_session: string;
  all_complete: string;
  cta_invites: string;
  cta_campaigns: string;
  cta_waiting: string;
}

interface PlayerActivationChecklistProps {
  status: PlayerChecklistStatus;
  translations: PlayerChecklistTranslations;
}

const CHECKLIST_DISMISSED_KEY = "pocketdm_player_checklist_dismissed";

interface ChecklistItem {
  key: keyof PlayerChecklistStatus;
  labelKey: keyof PlayerChecklistTranslations;
  icon: typeof Swords;
  href: string;
  disabled?: boolean;
}

const ITEMS: ChecklistItem[] = [
  { key: "hasAccount", labelKey: "item_account", icon: UserCheck, href: "/app/dashboard" },
  { key: "hasCampaign", labelKey: "item_campaign", icon: Users, href: "#pending-invites" },
  { key: "hasCharacter", labelKey: "item_character", icon: Swords, href: "/app/dashboard" },
  { key: "hasAttendedSession", labelKey: "item_session", icon: Sparkles, href: "#", disabled: true },
];

export function PlayerActivationChecklist({ status, translations: t }: PlayerActivationChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden, check localStorage
  const [collapsed, setCollapsed] = useState(false); // Mobile: collapsed by default

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true");
      // Mobile: start collapsed
      if (window.innerWidth < 768) setCollapsed(true);
    } catch {
      setDismissed(false);
    }
  }, []);

  const completedCount = ITEMS.filter((item) => status[item.key]).length;
  const allComplete = completedCount === ITEMS.length;
  const visible = !dismissed && !allComplete;

  // Auto-dismiss after all milestones complete
  useEffect(() => {
    if (allComplete && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
        try { localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true"); } catch { /* noop */ }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, dismissed]);

  const progress = (completedCount / ITEMS.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="player-activation-checklist"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded-xl border border-white/[0.08] bg-card p-4 sm:p-5"
          data-testid="player-activation-checklist"
        >
          {/* Header — tappable on mobile to expand/collapse */}
          <div
            className="flex items-center justify-between mb-3 cursor-pointer sm:cursor-default"
            onClick={() => setCollapsed((c) => !c)}
          >
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

          {/* Progress bar — always visible */}
          <div className="h-1.5 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {/* Checklist items — collapsible on mobile */}
          <AnimatePresence initial={false}>
          {!collapsed && (
          <motion.ul
            className="space-y-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {ITEMS.map((item) => {
              const done = status[item.key];
              const Icon = item.icon;
              const isDisabled = !done && item.disabled;
              return (
                <li key={item.key}>
                  <Link
                    href={done || isDisabled ? "#" : item.href}
                    onClick={done || isDisabled ? (e) => e.preventDefault() : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                      done
                        ? "text-muted-foreground/50 cursor-default"
                        : isDisabled
                          ? "text-muted-foreground/40 cursor-default"
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
          </motion.ul>
          )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
