"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

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
      className={`bg-card border border-border/60 rounded-xl cursor-pointer hover:border-amber-500/30 hover:shadow-sm transition-all ${
        size === "large" ? "p-5 min-h-[120px]" : "p-4 min-h-[80px]"
      }`}
    >
      <Icon className="w-5 h-5 text-amber-400 mb-2" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {count !== null && count > 0 && (
        <p className="text-2xl font-bold text-amber-400">{count}</p>
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
