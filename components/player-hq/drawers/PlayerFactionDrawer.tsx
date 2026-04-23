"use client";

import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

interface PlayerFactionDrawerProps {
  factionName: string;
  alignment: string;
  onClose: () => void;
}

export function PlayerFactionDrawer({
  factionName,
  alignment,
  onClose,
}: PlayerFactionDrawerProps) {
  const t = useTranslations("player_hq.faction_drawer");

  return (
    <Drawer
      title={factionName}
      icon={<Flag className="w-5 h-5" />}
      iconColor="text-rose-400"
      onClose={onClose}
    >
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">
          {t("alignment")}
        </label>
        <span className="text-sm text-foreground">{alignment}</span>
      </div>
    </Drawer>
  );
}
