"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";

export interface SavedEncounterRow {
  session_id: string;
  encounter_name: string;
  session_name: string;
  round_number: number;
  is_active: boolean;
  updated_at: string;
}

interface SavedEncountersProps {
  encounters: SavedEncounterRow[];
}

export function SavedEncounters({ encounters }: SavedEncountersProps) {
  const t = useTranslations("dashboard");
  if (encounters.length === 0) {
    return (
      <div className="mt-8" data-testid="saved-encounters">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t("encounters_title")}</h2>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Image src="/art/icons/pet-lunatic.png" alt="" width={64} height={64} className="pixel-art opacity-40 float-gentle" aria-hidden="true" unoptimized />
          <p className="text-muted-foreground text-sm">{t("encounters_empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8" data-testid="saved-encounters">
      <h2 className="text-lg font-semibold text-foreground mb-3">{t("encounters_title")}</h2>
      <div className="space-y-2">
        {encounters.map((enc) => (
          <Link
            key={enc.session_id}
            href={`/app/session/${enc.session_id}`}
            className="block bg-card border border-border rounded-md p-4 hover:border-gold/50 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            data-testid={`encounter-link-${enc.session_id}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-foreground font-medium text-sm">{enc.encounter_name}</span>
                <span className="text-muted-foreground text-xs ml-2">{enc.session_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-mono">
                  {t("encounters_round")} {enc.round_number}
                </span>
                {enc.is_active && (
                  <span className="text-xs text-green-400 font-medium">{t("encounters_in_progress")}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
