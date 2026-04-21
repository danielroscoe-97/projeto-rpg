"use server";

/**
 * cloneTemplateForUser — Epic 04 Story 04-C (Player-as-DM Upsell).
 *
 * Server-side wrapper around the `clone_campaign_from_template` RPC
 * (migration 170). The RPC returns a JSON envelope that can either be a
 * success payload OR a structured "missing monsters" failure (F9 — the
 * RPC accumulates ALL offending encounters and returns them in one shot,
 * instead of aborting on the first). Any other failure comes back as a
 * Postgres error with an SQLSTATE code that we map to a discriminated
 * union so the UI can branch without inspecting raw error strings.
 *
 * SQLSTATE → error code mapping (raised by the RPC, see 170):
 *   42501  → "forbidden"         — auth.uid() mismatch (F1)
 *   P0002  → "not_found"         — template missing or is_public=false
 *   anything else → "unknown"
 *
 * The RPC also returns a non-throwing "missing_monsters" envelope when
 * SRD whitelist validation fails for one or more encounters. That path
 * is reported as `code: "missing_monsters"` with the full list so the
 * caller (BecomeDmWizard → TemplateDetailModal) can render every
 * offending encounter at once.
 *
 * Defence-in-depth: the action itself ALSO checks auth.getUser(). The
 * RPC's auth.uid() guard is the authoritative check — we still pre-fail
 * here to avoid an unnecessary RPC round-trip when the cookie is gone.
 */

import { createClient } from "@/lib/supabase/server";

/** Per-encounter failure record returned when a template references slugs not
 *  in the SRD whitelist (see migration 170 — F9 accumulation). */
export interface MissingMonsterEntry {
  encounter_id: string;
  missing_slugs: string[];
}

export type CloneTemplateResult =
  | {
      ok: true;
      campaignId: string;
      joinCode: string;
      sessionId: string;
    }
  | {
      ok: false;
      code: "missing_monsters";
      missingMonsters: MissingMonsterEntry[];
    }
  | {
      ok: false;
      code: "forbidden";
    }
  | {
      ok: false;
      code: "not_found";
    }
  | {
      ok: false;
      code: "unknown";
      message: string;
    };

/**
 * Shape returned by the RPC on the happy path.
 * Narrowed defensively — Supabase types RPC returns as `unknown`.
 */
interface RpcOkEnvelope {
  ok: true;
  campaign_id: string;
  join_code: string;
  session_id: string;
}

/** Shape returned when SRD validation fails (F9). */
interface RpcMissingEnvelope {
  ok: false;
  missing_monsters: MissingMonsterEntry[];
}

type RpcEnvelope = RpcOkEnvelope | RpcMissingEnvelope | null;

export async function cloneTemplateForUser(
  templateId: string,
  userId: string,
): Promise<CloneTemplateResult> {
  const supabase = await createClient();

  // Pre-flight auth check — avoids a pointless RPC round-trip and keeps
  // the error surface in sync with other server actions. The RPC re-does
  // this check authoritatively (F1).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { ok: false, code: "forbidden" };
  }

  const { data, error } = await supabase.rpc("clone_campaign_from_template", {
    p_template_id: templateId,
    p_new_dm_user_id: userId,
  });

  if (error) {
    // Postgres SQLSTATE is surfaced as error.code by supabase-js. We
    // map only the two codes the RPC raises deliberately; anything
    // else is bucketed as unknown + original message for Sentry /
    // UI fallback.
    if (error.code === "42501") {
      return { ok: false, code: "forbidden" };
    }
    if (error.code === "P0002") {
      return { ok: false, code: "not_found" };
    }
    return {
      ok: false,
      code: "unknown",
      message: error.message || "RPC falhou",
    };
  }

  const envelope = data as RpcEnvelope;
  if (!envelope || typeof envelope !== "object") {
    return {
      ok: false,
      code: "unknown",
      message: "Resposta inesperada do servidor",
    };
  }

  if (envelope.ok === false) {
    // F9 — accumulated missing slugs envelope. Normalize to camelCase for
    // the UI; keep the per-encounter shape intact.
    return {
      ok: false,
      code: "missing_monsters",
      missingMonsters: Array.isArray(envelope.missing_monsters)
        ? envelope.missing_monsters
        : [],
    };
  }

  return {
    ok: true,
    campaignId: envelope.campaign_id,
    joinCode: envelope.join_code,
    sessionId: envelope.session_id,
  };
}
