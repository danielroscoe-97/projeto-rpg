/**
 * Shared Zod schema for player lobby registration.
 *
 * Used at TWO boundaries:
 *   - Client: `PlayerLobby.handleFormSubmit` uses safeParse to render
 *     field-level errors inline before firing the server action
 *   - Server: `registerPlayerCombatant` uses parse at the boundary so
 *     invalid data never reaches DB writes
 *
 * Floor-only semantics (Beta #4 F05 decision 2026-04-24):
 *   - initiative: ≥ 1 (d20 roll in the lobby is always positive; DM inline
 *     edits can still go down to -5 via a different path)
 *   - hp / ac: ≥ 1 when set, nullable (optional fields in the form)
 *   - No hard upper bound — BBEGs with +12 modifiers can land on 32+,
 *     legendary monsters have AC > 25
 *
 * H-3 fix (Estabilidade Combate review 2026-04-26): error MESSAGES are
 * locale-neutral codes. Both client and server are expected to map these
 * codes to user-facing text via the existing i18n stack (next-intl).
 * The schema's role is structural validation + identifying which field
 * failed and why — not producing UI strings. Previously the schema had
 * Portuguese strings that leaked into English locale toasts when the
 * server's `parse()` threw and the message was forwarded raw.
 *
 * Locale code convention: kebab-case grouped by field —
 *   "name.required", "name.too-long", "initiative.not-number",
 *   "initiative.not-integer", "initiative.below-floor", "hp.not-number",
 *   "hp.not-integer", "hp.not-positive", "ac.*" mirrors hp.*
 *
 * Mapping to user-facing strings happens via `messages/{en,pt-BR}.json`
 * keys under `player.validation.<code>`.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-05-zod-shared-validation.md
 */
import { z } from "zod";

export const PlayerRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name.required")
    .max(50, "name.too-long"),
  initiative: z
    .number({ message: "initiative.not-number" })
    .int("initiative.not-integer")
    .min(1, "initiative.below-floor"),
  hp: z
    .number({ message: "hp.not-number" })
    .int("hp.not-integer")
    .positive("hp.not-positive")
    .nullable(),
  ac: z
    .number({ message: "ac.not-number" })
    .int("ac.not-integer")
    .positive("ac.not-positive")
    .nullable(),
});

export type PlayerRegistration = z.infer<typeof PlayerRegistrationSchema>;
