/**
 * Shared types for the conversion-moment components (Epic 03).
 *
 * `SaveSignupContext` is the discriminated union that the recap CTA
 * card consumes to decide between the anon upgrade flow (Story 03-D)
 * and the guest signup+migrate flow (Story 03-E).
 *
 * Lives in its own file (not in `RecapCtaCard.tsx`) to avoid an
 * import cycle between `RecapActions.tsx` → `RecapCtaCard.tsx` →
 * `RecapActions.tsx`. Agent C (03-E, `GuestRecapFlow.tsx`) also
 * imports from here.
 */

import type { Combatant } from "@/lib/types/combat";

export type SaveSignupContext =
  | {
      mode: "anon";
      /** anon session_tokens.id — required for `AuthModal.upgradeContext`. */
      sessionTokenId: string;
      /** Campaign the anon player is currently sitting in. */
      campaignId: string;
      /** Already soft-claimed player_character id, if any. */
      characterId: string | null;
      /** Display copy anchor; `<em>{characterName}</em>` in the headline. */
      characterName: string | null;
    }
  | {
      mode: "guest";
      /** Display copy anchor (first is_player combatant by default). */
      characterName?: string | null;
      /**
       * Combatants with `is_player === true` extracted from the guest
       * snapshot by the caller (D5). Agent C's `GuestRecapFlow` handles
       * the picker UX when `guestCombatants.length >= 2` (F7).
       */
      guestCombatants: Combatant[];
      /** Rare — guest that already has a campaignId attached. */
      campaignId?: string;
    };
