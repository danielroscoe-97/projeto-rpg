"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/** Per-section icon color + glow for visual identity */
const SECTION_STYLE: Record<string, { iconClass: string; glowClass: string }> = {
  encounters: {
    iconClass: "text-red-400",
    glowClass: "bg-red-400/10 ring-1 ring-red-400/20",
  },
  quests: {
    iconClass: "text-amber-400",
    glowClass: "bg-amber-400/10 ring-1 ring-amber-400/20",
  },
  players: {
    iconClass: "text-emerald-400",
    glowClass: "bg-emerald-400/10 ring-1 ring-emerald-400/20",
  },
  npcs: {
    iconClass: "text-purple-400",
    glowClass: "bg-purple-400/10 ring-1 ring-purple-400/20",
  },
  locations: {
    iconClass: "text-cyan-400",
    glowClass: "bg-cyan-400/10 ring-1 ring-cyan-400/20",
  },
  factions: {
    iconClass: "text-rose-400",
    glowClass: "bg-rose-400/10 ring-1 ring-rose-400/20",
  },
  notes: {
    iconClass: "text-blue-400",
    glowClass: "bg-blue-400/10 ring-1 ring-blue-400/20",
  },
  inventory: {
    iconClass: "text-amber-400",
    glowClass: "bg-amber-400/10 ring-1 ring-amber-400/20",
  },
  mindmap: {
    iconClass: "text-indigo-400",
    glowClass: "bg-indigo-400/10 ring-1 ring-indigo-400/20",
  },
};

const DEFAULT_STYLE = {
  iconClass: "text-amber-400",
  glowClass: "bg-amber-400/10 ring-1 ring-amber-400/20",
};

interface CampaignGridCardProps {
  sectionId: string;
  icon: LucideIcon;
  title: string;
  count: number | null;
  flavor?: string;
  size: "large" | "compact";
}

export function CampaignGridCard({
  sectionId,
  icon: Icon,
  title,
  count,
  flavor,
  size,
}: CampaignGridCardProps) {
  const router = useRouter();
  const t = useTranslations("campaign");
  const style = SECTION_STYLE[sectionId] ?? DEFAULT_STYLE;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={() => router.push(`?section=${sectionId}`, { scroll: false })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`?section=${sectionId}`, { scroll: false });
        }
      }}
      className={`bg-card border border-white/[0.04] rounded-xl cursor-pointer hover:border-amber-500/30 hover:shadow-[0_0_15px_-5px_rgba(212,168,83,0.15)] transition-all ${
        size === "large" ? "p-5 min-h-[120px]" : "p-4 min-h-[80px]"
      }`}
    >
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${style.glowClass}`}>
        <Icon className={`w-4 h-4 ${style.iconClass}`} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {count !== null && count > 0 && (
        <p className={`text-2xl font-bold ${style.iconClass}`}>{count}</p>
      )}
      {count === 0 && (
        <p className="text-xs text-muted-foreground">{t("hub_card_empty")}</p>
      )}
      {size === "large" && flavor && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {flavor}
        </p>
      )}
    </motion.div>
  );
}
