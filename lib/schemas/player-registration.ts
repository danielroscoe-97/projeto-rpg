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
 * Locale code convention: snake_case grouped by field — matches the i18n
 * key shape under `messages/{en,pt-BR}.json` `player.validation.<code>`,
 * so a caller can translate with one call: `t(\`validation.${code}\`)`.
 *
 *   "name_required", "name_too_long",
 *   "initiative_not_number", "initiative_not_integer", "initiative_below_floor",
 *   "hp_not_number", "hp_not_integer", "hp_not_positive",
 *   "ac_not_number", "ac_not_integer", "ac_not_positive"
 *
 * F7 (Estabilidade Combate, 2026-04-26): codes were originally kebab-case
 * with dots (e.g. "name.required") but the i18n keys use snake_case
 * (`name_required`). The client never bridged the two — error mapping
 * was effectively dead code. Aligning conventions lets the client do
 * `t(\`validation.${code}\`)` directly.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-05-zod-shared-validation.md
 */
import { z } from "zod";

export const PlayerRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name_required")
    .max(50, "name_too_long"),
  initiative: z
    .number({ message: "initiative_not_number" })
    .int("initiative_not_integer")
    .min(1, "initiative_below_floor"),
  hp: z
    .number({ message: "hp_not_number" })
    .int("hp_not_integer")
    .positive("hp_not_positive")
    .nullable(),
  ac: z
    .number({ message: "ac_not_number" })
    .int("ac_not_integer")
    .positive("ac_not_positive")
    .nullable(),
});

export type PlayerRegistration = z.infer<typeof PlayerRegistrationSchema>;
