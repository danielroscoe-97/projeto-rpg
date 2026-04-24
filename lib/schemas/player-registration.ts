/**
 * Shared Zod schema for player lobby registration.
 *
 * Used at TWO boundaries:
 *   - Client: `PlayerLobby.handleFormSubmit` uses safeParse to render
 *     field-level errors inline before firing the server action
 *   - Server: `registerPlayerCombatant` uses parse at the boundary so
 *     invalid data never reaches DB writes
 *
 * Single source of truth closes the IG-1 drift discovered in the PR #48
 * code review: previously client allowed values the server rejected,
 * surfacing as generic toast errors instead of field-highlighted feedback.
 *
 * Floor-only semantics (Beta #4 F05 decision 2026-04-24):
 *   - initiative: ≥ 1 (d20 roll in the lobby is always positive; DM inline
 *     edits can still go down to -5 via a different path)
 *   - hp / ac: ≥ 1 when set, nullable (optional fields in the form)
 *   - No hard upper bound — BBEGs with +12 modifiers can land on 32+,
 *     legendary monsters can have AC > 25
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-05-zod-shared-validation.md
 */
import { z } from "zod";

export const PlayerRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(50, "Nome muito longo (máximo 50 caracteres)"),
  initiative: z
    .number({ message: "Iniciativa precisa ser um número" })
    .int("Iniciativa precisa ser um número inteiro")
    .min(1, "Iniciativa precisa ser ≥ 1"),
  hp: z
    .number({ message: "HP precisa ser um número" })
    .int("HP precisa ser um número inteiro")
    .positive("HP precisa ser > 0")
    .nullable(),
  ac: z
    .number({ message: "AC precisa ser um número" })
    .int("AC precisa ser um número inteiro")
    .positive("AC precisa ser > 0")
    .nullable(),
});

export type PlayerRegistration = z.infer<typeof PlayerRegistrationSchema>;
