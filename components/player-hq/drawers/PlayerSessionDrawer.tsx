"use client";

import { useTranslations } from "next-intl";
import { Scroll } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

interface PlayerSessionDrawerProps {
  sessionName: string;
  isActive: boolean;
  statusLabel: string;
  onClose: () => void;
}

export function PlayerSessionDrawer({
  sessionName,
  isActive,
  statusLabel,
  onClose,
}: PlayerSessionDrawerProps) {
  const t = useTranslations("player_hq.session_drawer");

  return (
    <Drawer
      title={sessionName}
      icon={<Scroll className="w-5 h-5" />}
      iconColor="text-blue-400"
      onClose={onClose}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            isActive
              ? "bg-blue-900/40 text-blue-300 animate-pulse"
              : "bg-gray-800/40 text-gray-300"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
    </Drawer>
  );
}
