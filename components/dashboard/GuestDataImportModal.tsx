"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Swords } from "lucide-react";
import {
  getGuestEncounterData,
  clearGuestEncounterData,
  getGuestCombatSnapshot,
  clearGuestCombatSnapshot,
} from "@/lib/stores/guest-combat-store";
import { createEncounterWithCombatants } from "@/lib/supabase/encounter";
import { trackEvent } from "@/lib/analytics/track";

export function GuestDataImportModal() {
  const t = useTranslations("guest");
  const router = useRouter();
  const [guestData, setGuestData] = useState<ReturnType<typeof getGuestEncounterData>>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check sessionStorage encounter data first, then localStorage snapshot (from expiry flow)
    const sessionData = getGuestEncounterData();
    if (sessionData && sessionData.combatants.length > 0) {
      setGuestData(sessionData);
      return;
    }
    const snapshot = getGuestCombatSnapshot();
    if (snapshot && snapshot.combatants.length > 0) {
      setGuestData({
        combatants: snapshot.combatants,
        roundNumber: snapshot.roundNumber,
        currentTurnIndex: snapshot.currentTurnIndex,
        phase: "combat",
      });
    }
  }, []);

  if (!guestData) return null;

  const handleDiscard = () => {
    clearGuestEncounterData();
    clearGuestCombatSnapshot();
    setGuestData(null);
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const { session_id } = await createEncounterWithCombatants(
        guestData.combatants,
        "2014",
        null,
        t("import_encounter_name"),
      );

      clearGuestEncounterData();
      clearGuestCombatSnapshot();
      setGuestData(null);
      trackEvent("guest:combat_imported");
      // Save imported session_id for the dashboard tour CTA
      try { sessionStorage.setItem("imported-encounter-id", session_id); } catch { /* ignore */ }
      router.push(`/app/session/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import_error"));
      setImporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 space-y-3 mb-6">
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-gold shrink-0" />
        <div>
          <h3 className="font-display text-foreground font-semibold">
            {t("import_title")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("import_description")}
          </p>
        </div>
      </div>
      <p className="text-sm text-foreground/80 font-mono">
        {t("import_preview", {
          count: guestData.combatants.length,
          round: guestData.roundNumber,
        })}
      </p>
      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="gold" size="sm" onClick={handleImport} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("import_button")}
            </>
          ) : (
            t("import_button")
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={importing}>
          {t("import_discard")}
        </Button>
      </div>
    </div>
  );
}
