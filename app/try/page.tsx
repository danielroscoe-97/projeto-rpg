import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestCombatClient } from "@/components/guest/GuestCombatClient";
import { SrdInitializer } from "@/components/srd/SrdInitializer";

export const metadata: Metadata = {
  title: "Modo Visitante — Combat Tracker D&D 5e Grátis",
  description:
    "Experimente o combat tracker D&D 5e sem criar conta. Iniciativa, HP, condições e magias em tempo real. Try the free D&D 5e combat tracker — no signup required.",
  alternates: {
    canonical: "/try",
    languages: { "pt-BR": "/try", en: "/try" },
  },
  openGraph: {
    title: "Pocket DM — Experimente Grátis",
    description:
      "Combat tracker D&D 5e sem criar conta. Iniciativa, HP, condições e magias em tempo real.",
    url: "/try",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pocket DM — Combat Tracker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocket DM — Experimente Grátis",
    description: "Combat tracker D&D 5e sem criar conta. Teste agora.",
    images: ["/opengraph-image"],
  },
};

export default async function TryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app/session/new?quick=true");
  }

  return (
    <>
      <SrdInitializer />
      <GuestCombatClient />
    </>
  );
}
