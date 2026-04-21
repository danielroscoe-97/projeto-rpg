// ---------------------------------------------------------------------------
// Extract clickable dice notations from SRD monster description text.
//
// Recognises patterns found in standard 5e stat blocks:
//   "+9 to hit"              → 1d20+9  (attack roll — 2014 format)
//   "Attack: +5"             → 1d20+5  (attack roll — 2024 format)
//   "12 (2d6 + 5)"          → 2d6+5   (damage with average)
//   "DC 14 Constitution"    → 1d20    (saving throw — DC display only)
//   "1d4 hours"             → 1d4     (standalone dice expression)
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
  // Groups 1+2: "X (NdS + M) type damage"  — damage with average
  //   captures: avg, dice notation (with optional spaces around +/-)
  // Group 3:    "+N to hit"                 — attack roll (2014 format)
  // Group 4:    "Attack: +N"                — attack roll (2024 format, lookbehind)
  // Group 5:    standalone dice "NdS+M"     — e.g. "1d4 hours"
  const DICE_RE =
    // eslint-disable-next-line security/detect-unsafe-regex -- Static regex for dice notation parsing; input is bounded SRD text, no ReDoS risk
    /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)|\+(\d+) to hit|(?<=Attack:\s*)\+(\d+)|(?<!\w)(\d*d\d+(?:\s*[+-]\s*\d+)?)(?!\w)/gi;

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
      // Attack pattern (2024): "Attack: +5" — lookbehind keeps "Attack: " in text segment
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
      // Standalone dice: "1d4", "2d6+3"
      const notation = match[5].replace(/\s/g, "");
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
