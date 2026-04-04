"use client";

import { useTranslations } from "next-intl";
import { MapPin, HelpCircle } from "lucide-react";
import { DrawerShell } from "./DrawerShell";

interface PlayerLocationDrawerProps {
  locationName: string;
  locationType: string;
  isDiscovered: boolean;
  onClose: () => void;
}

export function PlayerLocationDrawer({
  locationName,
  locationType,
  isDiscovered,
  onClose,
}: PlayerLocationDrawerProps) {
  const t = useTranslations("player_hq.location_drawer");

  return (
    <DrawerShell
      title={isDiscovered ? locationName : "???"}
      icon={isDiscovered ? <MapPin className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      iconColor="text-cyan-400"
      onClose={onClose}
    >
      {isDiscovered ? (
        <>
          <div>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 font-medium">
              {locationType}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("discovered_hint")}</p>
        </>
      ) : (
        <div className="flex flex-col items-center py-8 gap-3">
          <HelpCircle className="w-12 h-12 text-cyan-400/30" />
          <p className="text-sm text-muted-foreground italic text-center">
            {t("undiscovered")}
          </p>
        </div>
      )}
    </DrawerShell>
  );
}
