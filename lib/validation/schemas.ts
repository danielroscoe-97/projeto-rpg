import { z } from "zod";

/** Player character creation/edit */
export const playerCharacterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  max_hp: z.number().int().min(1, "HP must be at least 1").max(9999),
  current_hp: z.number().int().min(0).max(9999),
  ac: z.number().int().min(0, "AC must be non-negative").max(99),
  spell_save_dc: z.number().int().min(0).max(99).nullable(),
});

/** Campaign creation */
export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().max(1000).nullable().optional(),
});

/** Combatant stats update */
export const combatantStatsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  max_hp: z.number().int().min(1).max(9999).optional(),
  current_hp: z.number().int().min(0).max(9999).optional(),
  ac: z.number().int().min(0).max(99).optional(),
  spell_save_dc: z.number().int().min(0).max(99).nullable().optional(),
});

/** HP adjustment */
export const hpAdjustmentSchema = z.object({
  amount: z.number().int().min(0, "Amount must be non-negative").max(9999),
});

/** Session state polling response validation */
export const sessionIdSchema = z.string().uuid("Invalid session ID");

/** Admin content edit */
export const adminContentEditSchema = z.object({
  entity_type: z.enum(["monster", "spell"]),
  entity_id: z.string().min(1),
  ruleset_version: z.enum(["2014", "2024"]),
  data: z.record(z.string(), z.unknown()),
});
