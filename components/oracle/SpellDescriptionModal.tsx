"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VersionBadge } from "@/components/session/RulesetSelector";
import type { SrdSpell } from "@/lib/srd/srd-loader";

interface SpellDescriptionModalProps {
  spell: SrdSpell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPin?: () => void;
}

function spellLevelLabel(level: number, school: string): string {
  if (level === 0) return `${school} cantrip`;
  const suffix =
    level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}-level ${school}`;
}

export function SpellDescriptionModal({
  spell,
  open,
  onOpenChange,
  onPin,
}: SpellDescriptionModalProps) {
  if (!spell) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        aria-describedby="spell-description"
        data-testid="spell-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{spell.name}</DialogTitle>
            <VersionBadge version={spell.ruleset_version} />
            {onPin && (
              <button
                type="button"
                onClick={onPin}
                className="ml-auto px-2 py-0.5 text-xs text-muted-foreground border border-border rounded hover:text-foreground hover:border-gold/40 transition-colors"
                aria-label={`Pin ${spell.name} card`}
                data-testid="spell-modal-pin-btn"
              >
                📌 Pin
              </button>
            )}
          </div>
          <p className="text-sm text-white/60 italic" data-testid="spell-level-school">
            {spellLevelLabel(spell.level, spell.school)}
          </p>
        </DialogHeader>

        {/* Properties grid */}
        <div className="grid grid-cols-2 gap-2 text-sm" data-testid="spell-properties">
          <div>
            <span className="text-white/50 font-medium">Casting Time</span>
            <p className="text-white">{spell.casting_time}</p>
          </div>
          <div>
            <span className="text-white/50 font-medium">Range</span>
            <p className="text-white">{spell.range}</p>
          </div>
          <div>
            <span className="text-white/50 font-medium">Components</span>
            <p className="text-white">{spell.components}</p>
          </div>
          <div>
            <span className="text-white/50 font-medium">Duration</span>
            <p className="text-white">{spell.duration}</p>
          </div>
        </div>

        {/* Tags */}
        {(spell.concentration || spell.ritual) && (
          <div className="flex gap-2" data-testid="spell-tags">
            {spell.concentration && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                Concentration
              </span>
            )}
            {spell.ritual && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                Ritual
              </span>
            )}
          </div>
        )}

        <div className="border-t border-white/10" />

        {/* Description */}
        <div id="spell-description" data-testid="spell-description">
          <p className="text-sm text-white whitespace-pre-line">
            {spell.description}
          </p>
        </div>

        {/* At Higher Levels */}
        {spell.higher_levels && (
          <div data-testid="spell-higher-levels">
            <p className="text-sm font-semibold text-white mb-1">
              At Higher Levels.
            </p>
            <p className="text-sm text-white/80">{spell.higher_levels}</p>
          </div>
        )}

        <div className="border-t border-white/10" />

        {/* Classes */}
        <div data-testid="spell-classes">
          <span className="text-sm text-white/50 font-medium">Classes: </span>
          <span className="text-sm text-white">
            {spell.classes.join(", ")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
