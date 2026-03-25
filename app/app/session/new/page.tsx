"use client";

import { CombatSessionClient } from "@/components/session/CombatSessionClient";

export default function NewEncounterPage() {
  return (
    <CombatSessionClient
      sessionId={null}
      encounterId={null}
      initialCombatants={[]}
      isActive={false}
      roundNumber={1}
      currentTurnIndex={0}
    />
  );
}
