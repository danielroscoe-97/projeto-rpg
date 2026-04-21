// ---------------------------------------------------------------------------
// Extract clickable dice notations from SRD monster description text.
//
// Recognises patterns found in standard 5e stat blocks (EN + PT-BR):
//   "+9 to hit" / "+9 para acertar"     → 1d20+9  (attack roll — 2014 format)
//   "Attack: +5" / "Ataque ...: +5"     → 1d20+5  (attack roll — 2024 format)
//   "12 (2d6 + 5)"                      → 2d6+5   (damage with average)
//   "(Recharge 5-6)" / "(Recharge 6)"   → 1d6     (recharge roll)
//   "1d4 hours"                         → 1d4     (standalone dice expression)
// ---------------------------------------------------------------------------

export interface DiceSegment {
  kind: "text" | "dice";
  content: string;
  /** Dice notation to roll when clicked (only for kind === "dice") */
  notation?: string;
  /** Contextual label for the roll tooltip */
  label?: string;
}

/**
 * Split a description string into text and clickable dice segments.
 *
 * The function is conservative — it only marks patterns that are
 * unambiguously dice-related to avoid false positives.
 */
export function parseDiceInText(text: string, actionName?: string): DiceSegment[] {
  if (!text) return [{ kind: "text", content: "" }];

  // Combined regex — ordered so longer/more-specific patterns match first.
  //
  // Groups 1+2: "X (NdS + M) type damage"        — damage with average
  // Group 3:    "+N to hit" / "+N para acertar"  — attack roll (2014 EN+PT)
  // Group 4:    "Attack: +N" / "Ataque ...: +N"  — attack roll (2024 EN+PT, lookbehind)
  // Group 5+6:  "Recharge N-M" / "Recharge N"    — recharge roll (rolls 1d6)
  // Group 7:    standalone dice "NdS+M"          — e.g. "1d4 hours"
  const DICE_RE =
    // eslint-disable-next-line security/detect-unsafe-regex -- Static regex for dice notation parsing; input is bounded SRD text, no ReDoS risk
    /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)|\+(\d+)\s+(?:to hit|para acertar)|(?<=(?:Attack|Ataque[^:\n]{0,80}):\s*)\+(\d+)|Recharge\s+(\d+)(?:[-–](\d+))?|(?<!\w)(\d*d\d+(?:\s*[+-]\s*\d+)?)(?!\w)/gi;

  const segments: DiceSegment[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = DICE_RE.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      segments.push({ kind: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Damage pattern: "12 (2d6 + 5)"
      const notation = match[2].replace(/\s/g, "");
      const label = actionName ? `${actionName} (damage)` : "Damage";
      segments.push({
        kind: "dice",
        content: match[0],
        notation,
        label,
      });
    } else if (match[3] !== undefined) {
      // Attack pattern (2014): "+9 to hit"
      const bonus = match[3];
      const notation = `1d20+${bonus}`;
      const label = actionName ? `${actionName} (attack)` : "Attack";
      segments.push({
        kind: "dice",
        content: match[0],
        notation,
        label,
      });
    } else if (match[4] !== undefined) {
      // Attack pattern (2024 EN+PT): lookbehind keeps preamble in text segment
      const bonus = match[4];
      const notation = `1d20+${bonus}`;
      const label = actionName ? `${actionName} (attack)` : "Attack";
      segments.push({
        kind: "dice",
        content: match[0],
        notation,
        label,
      });
    } else if (match[5] !== undefined) {
      // Recharge: "Recharge 5-6" / "Recharge 6" → roll 1d6
      const label = actionName ? `${actionName} (recharge)` : "Recharge";
      segments.push({
        kind: "dice",
        content: match[0],
        notation: "1d6",
        label,
      });
    } else if (match[7] !== undefined) {
      // Standalone dice: "1d4", "2d6+3"
      const notation = match[7].replace(/\s/g, "");
      const label = actionName ?? "Roll";
      segments.push({
        kind: "dice",
        content: match[0],
        notation,
        label,
      });
    } else {
      // Safety — shouldn't happen
      segments.push({ kind: "text", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    segments.push({ kind: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
