"use client";

/**
 * DefaultCharacterSettings — Story 02-G (Epic 02, Area 5).
 *
 * Simple list + "Tornar padrão" button per character. Wraps the server
 * action in a startTransition so the page stays responsive while the
 * UPDATE + revalidatePath round-trips. The server is the source of truth
 * for `defaultCharacterId` — we intentionally DO NOT mirror it in local
 * state; the `revalidatePath` call in the action re-renders this page with
 * the fresh value.
 */

import Link from "next/link";
import { useTransition, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { updateDefaultCharacter } from "@/lib/user/update-default-character";

export interface DefaultCharacterRow {
  id: string;
  name: string;
  race: string | null;
  characterClass: string | null;
  level: number | null;
  tokenUrl: string | null;
  campaignId: string | null;
  campaignName: string | null;
}

interface DefaultCharacterSettingsProps {
  characters: DefaultCharacterRow[];
  defaultCharacterId: string | null;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function DefaultCharacterSettings({
  characters,
  defaultCharacterId,
}: DefaultCharacterSettingsProps) {
  const t = useTranslations("dashboard.defaultCharacterSettings");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleMakeDefault = (characterId: string) => {
    setError(null);
    setPendingId(characterId);
    startTransition(async () => {
      const res = await updateDefaultCharacter(characterId);
      if (!res.ok) {
        setError(res.error);
      }
      setPendingId(null);
    });
  };

  return (
    <section aria-labelledby="default-character-title">
      <header className="mb-6">
        <nav
          aria-label={t("breadcrumb")}
          className="mb-3 text-xs text-muted-foreground"
        >
          <Link href="/app/dashboard" className="hover:text-foreground">
            {t("breadcrumb")}
          </Link>
        </nav>
        <h1
          id="default-character-title"
          className="font-heading text-2xl text-foreground"
        >
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {characters.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center"
          data-testid="dashboard.default-character.empty-state"
        >
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {characters.map((char) => {
            const isDefault = defaultCharacterId === char.id;
            const raceClassLine = [char.race, char.characterClass]
              .filter(Boolean)
              .join(" ");
            const isPendingThis = isPending && pendingId === char.id;
            return (
              <li
                key={char.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
                data-testid={`dashboard.default-character.character-card-${char.id}`}
              >
                <div
                  aria-hidden="true"
                  className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-background"
                >
                  {char.tokenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={char.tokenUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-display text-lg font-semibold text-gold">
                      {initialOf(char.name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {char.name}
                  </p>
                  {raceClassLine && (
                    <p className="truncate text-xs text-muted-foreground">
                      {raceClassLine}
                      {char.level ? ` · Lv ${char.level}` : ""}
                    </p>
                  )}
                  {char.campaignName && (
                    <p className="truncate text-[11px] text-muted-foreground/80">
                      {char.campaignName}
                    </p>
                  )}
                </div>

                {isDefault ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/20 px-2.5 py-1 text-[11px] font-bold text-gold"
                    data-testid={`dashboard.default-character.current-badge-${char.id}`}
                  >
                    <Star aria-hidden="true" className="h-3 w-3" />
                    {t("currentBadge")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isPendingThis}
                    onClick={() => handleMakeDefault(char.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.04] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    data-testid={`dashboard.default-character.make-default-${char.id}`}
                  >
                    {isPendingThis ? t("makingDefault") : t("makeDefault")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-red-400"
          data-testid="dashboard.default-character.error"
        >
          {t(`errors.${error}`)}
        </p>
      )}
    </section>
  );
}
