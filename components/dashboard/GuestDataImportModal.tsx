"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Swords } from "lucide-react";
import {
  getGuestEncounterData,
  clearGuestEncounterData,
} from "@/lib/stores/guest-combat-store";
import { createClient } from "@/lib/supabase/client";

export function GuestDataImportModal() {
  const t = useTranslations("guest");
  const router = useRouter();
  const [guestData, setGuestData] = useState<ReturnType<typeof getGuestEncounterData>>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const data = getGuestEncounterData();
    if (data && data.combatants.length > 0) {
      setGuestData(data);
    }
  }, []);

  if (!guestData) return null;

  const handleDiscard = () => {
    clearGuestEncounterData();
    setGuestData(null);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create encounter
      const { data: encounter, error: encError } = await supabase
        .from("encounters")
        .insert({
          name: `Guest Import`,
          user_id: user.id,
          round_number: guestData.roundNumber,
          current_turn_index: guestData.currentTurnIndex,
          status: guestData.phase === "combat" ? "active" : "setup",
        })
        .select("id")
        .single();

      if (encError || !encounter) throw encError;

      // Insert combatants
      const combatantRows = guestData.combatants.map((c, i) => ({
        encounter_id: encounter.id,
        name: c.name,
        current_hp: c.current_hp,
        max_hp: c.max_hp,
        temp_hp: c.temp_hp,
        ac: c.ac,
        spell_save_dc: c.spell_save_dc,
        initiative: c.initiative,
        initiative_order: c.initiative_order ?? i,
        conditions: c.conditions,
        ruleset_version: c.ruleset_version,
        is_defeated: c.is_defeated,
        is_player: c.is_player,
        monster_id: c.monster_id,
        dm_notes: c.dm_notes || "",
        player_notes: c.player_notes || "",
      }));

      const { error: combError } = await supabase
        .from("combatants")
        .insert(combatantRows);

      if (combError) throw combError;

      clearGuestEncounterData();
      setGuestData(null);
      router.push(`/app/combat/${encounter.id}`);
    } catch {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 space-y-3">
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
