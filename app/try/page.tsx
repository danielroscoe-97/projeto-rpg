import type { Metadata } from "next";
import { GuestCombatClient } from "@/components/guest/GuestCombatClient";

export const metadata: Metadata = {
  title: "Pocket DM — Modo Visitante",
  description:
    "Experimente o combat tracker D&D 5e sem criar conta. Iniciativa, HP, condições e magias em tempo real.",
};

export default function TryPage() {
  return <GuestCombatClient />;
}
