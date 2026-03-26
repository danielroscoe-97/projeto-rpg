"use client";

import { useMemo } from "react";
import { parseDiceInText } from "@/lib/dice/parse-dice";
import { ClickableRoll } from "./ClickableRoll";
import { LinkedText } from "@/components/oracle/LinkedText";
import type { RulesetVersion } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// DiceText — renders SRD description text with both:
//   1. Clickable dice notations (attack rolls, damage, standalone dice)
//   2. Linked spell/condition cross-references (via LinkedText)
//
// Dice patterns are parsed first, then each text segment is passed through
// LinkedText for spell/condition linking.
// ---------------------------------------------------------------------------

export interface DiceTextProps {
  text: string;
  rulesetVersion: RulesetVersion;
  /** Action name for contextual labels, e.g. "Tentacle" */
  actionName?: string;
}

export function DiceText({ text, rulesetVersion, actionName }: DiceTextProps) {
  const segments = useMemo(
    () => parseDiceInText(text, actionName),
    [text, actionName],
  );

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "dice" && seg.notation) {
          return (
            <ClickableRoll
              key={i}
              notation={seg.notation}
              label={seg.label}
            >
              {seg.content}
            </ClickableRoll>
          );
        }
        // Text segments get spell/condition linking
        return (
          <LinkedText key={i} text={seg.content} rulesetVersion={rulesetVersion} />
        );
      })}
    </>
  );
}
