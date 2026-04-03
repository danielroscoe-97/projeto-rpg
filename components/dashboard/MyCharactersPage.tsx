"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PlayerCharacter } from "@/lib/types/database";

interface Campaign {
  id: string;
  name: string;
}

interface CharacterWithCampaign extends PlayerCharacter {
  campaigns: Campaign | null;
}

interface Props {
  initialCharacters: CharacterWithCampaign[];
}

export function MyCharactersPage({ initialCharacters }: Props) {
  const t = useTranslations("characters_page");
  const router = useRouter();

  // Group by campaign, preserving order (first-seen = most recently updated)
  const grouped = initialCharacters.reduce<
    Record<string, { campaign: Campaign; characters: CharacterWithCampaign[] }>
  >((acc, char) => {
    if (!char.campaigns) return acc;
    const key = char.campaigns.id;
    if (!acc[key]) {
      acc[key] = { campaign: char.campaigns, characters: [] };
    }
    acc[key].characters.push(char);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/dashboard/campaigns">{t("view_campaigns")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-heading text-foreground">{t("title")}</h1>

      {groups.map(({ campaign, characters }) => (
        <section key={campaign.id} className="space-y-3">
          <h2 className="text-sm font-heading text-muted-foreground tracking-wide">
            {campaign.name}
          </h2>
          <div className="space-y-2">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onClick={() => router.push(`/app/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
