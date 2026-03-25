import type { Metadata } from "next";
import { GuestCombatClient } from "@/components/guest/GuestCombatClient";

export const metadata: Metadata = {
  title: "Taverna do Mestre — Combat Tracker (Modo Visitante)",
  description:
    "Experimente o combat tracker D&D 5e sem criar uma conta. Iniciativa, HP, condições e oráculo — tudo grátis.",
};

export default function TryPage() {
  return <GuestCombatClient />;
}
