"use client";

import Link from "next/link";
import Image from "next/image";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CombatHistoryCard } from "@/components/dashboard/CombatHistoryCard";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";

interface CombatsPageClientProps {
  savedEncounters: SavedEncounterRow[];
  translations: {
    encounters_title: string;
    encounters_empty: string;
    encounters_start_combat: string;
    encounters_round: string;
    encounters_in_progress: string;
    new_session: string;
  };
}

export function CombatsPageClient({
  savedEncounters,
  translations: t,
}: CombatsPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t.encounters_title}
        </h1>
        <Link
          href="/app/session/new"
          className="inline-flex items-center justify-center gap-2 bg-gold text-surface-primary font-semibold px-4 py-1.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px]"
        >
          <Swords className="w-4 h-4" aria-hidden="true" />
          {t.new_session}
        </Link>
      </div>

      {savedEncounters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Image
            src="/art/icons/pet-lunatic.png"
            alt=""
            width={64}
            height={64}
            className="pixel-art opacity-40 float-gentle"
            aria-hidden="true"
            unoptimized
          />
          <p className="text-muted-foreground text-sm">{t.encounters_empty}</p>
          <Button variant="gold" size="sm" asChild className="mt-2">
            <Link href="/app/session/new">{t.encounters_start_combat}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {savedEncounters.map((enc) => (
            <CombatHistoryCard
              key={enc.session_id}
              combat={enc}
              translations={{
                round: t.encounters_round,
                in_progress: t.encounters_in_progress,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
