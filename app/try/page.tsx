import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestCombatClient } from "@/components/guest/GuestCombatClient";

export const metadata: Metadata = {
  title: "Modo Visitante",
  description:
    "Experimente o combat tracker D&D 5e sem criar conta. Iniciativa, HP, condições e magias em tempo real.",
};

export default async function TryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app/session/new?quick=true");
  }

  return <GuestCombatClient />;
}
