"use server";

/**
 * roleFlipAndCreateCampaign — Epic 04 Story 04-F (Player-as-DM Upsell wizard).
 *
 * Single server action that atomically:
 *   1. Flips the caller's role from 'player' to 'both' (or keeps 'both').
 *   2. Persists the `share_past_companions` opt-in (D8 privacy).
 *   3. Clones a selected template OR creates a blank campaign.
 *   4. Emits `dm_upsell:role_upgraded_to_dm` + `dm_upsell:first_campaign_created`
 *      analytics events (D14 — server-side, not SQL trigger).
 *   5. Returns the new campaign/session ids so the wizard can redirect.
 *
 * On clone failure AFTER a successful role flip, we rollback the role to
 * the prior value so the user isn't silently left as DM with no campaign.
 * If the rollback itself fails (rare), we report `clone_failed_no_rollback`
 * — the UI should surface this as "we couldn't set things up; try again"
 * and the next wizard pass will reconcile.
 *
 * F18 (migration 166) — the `trg_set_first_campaign_created_at` trigger
 * writes `user_onboarding.first_campaign_created_at` automatically when
 * a new campaigns row is inserted. We do NOT touch that column here.
 */

import { createClient } from "@/lib/supabase/server";
import { cloneTemplateForUser } from "@/lib/upsell/clone-template";
import { trackServerEvent } from "@/lib/analytics/track-server";
import type { UserRole } from "@/lib/stores/role-store";

export type RoleFlipAndCreateInput =
  | {
      mode: "template";
      templateId: string;
      sharePastCompanions: boolean;
    }
  | {
      mode: "blank";
      campaignName: string;
      partyLevel: number;
      sharePastCompanions: boolean;
    };

export type RoleFlipAndCreateResult =
  | {
      ok: true;
      campaignId: string;
      joinCode: string;
      sessionId: string | null;
      prevRole: UserRole;
      newRole: "both";
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "already_dm"
        | "role_flip_failed"
        | "clone_failed"
        | "clone_failed_no_rollback"
        | "missing_monsters"
        | "template_not_found"
        | "unknown";
      message?: string;
      /** Present when code === 'missing_monsters' — forwarded from the RPC. */
      missingMonsters?: Array<{ encounter_id: string; missing_slugs: string[] }>;
    };

const CAMPAIGN_NAME_MAX = 50;

export async function roleFlipAndCreateCampaign(
  input: RoleFlipAndCreateInput,
): Promise<RoleFlipAndCreateResult> {
  const supabase = await createClient();

  // ── Auth ──
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, code: "unauthenticated" };
  }

  // ── Validate blank-campaign inputs up front ──
  if (input.mode === "blank") {
    const trimmed = input.campaignName?.trim();
    if (!trimmed || trimmed.length === 0 || trimmed.length > CAMPAIGN_NAME_MAX) {
      return {
        ok: false,
        code: "unknown",
        message: "Invalid campaign name",
      };
    }
    if (
      !Number.isInteger(input.partyLevel) ||
      input.partyLevel < 1 ||
      input.partyLevel > 20
    ) {
      return {
        ok: false,
        code: "unknown",
        message: "Invalid party level",
      };
    }
  }

  // ── Read prev role (needed for rollback and analytics diff) ──
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (userErr) {
    return { ok: false, code: "role_flip_failed", message: userErr.message };
  }
  const prevRole = (userRow?.role as UserRole) ?? "player";

  // Defense-in-depth: wizard should never reach here with role='dm' (the
  // CTA gate already hides the entry point), but if it does, fail
  // explicitly rather than silently double-flipping.
  if (prevRole === "dm") {
    return { ok: false, code: "already_dm" };
  }

  // ── 1. Role flip + privacy opt-in ──
  //
  // We flip BEFORE clone so that:
  //   - If flip fails, no campaign is orphaned.
  //   - If clone fails after, we rollback via an explicit UPDATE.
  //
  // `both` is the target — even if user was already 'both' (coming back
  // to the wizard to create a second campaign), the update is a no-op
  // on `role` and still writes the privacy flag.
  const { error: flipErr } = await supabase
    .from("users")
    .update({
      role: "both",
      share_past_companions: input.sharePastCompanions,
    })
    .eq("id", user.id);
  if (flipErr) {
    return { ok: false, code: "role_flip_failed", message: flipErr.message };
  }

  // ── 2. Clone template OR create blank ──
  let campaignId: string;
  let joinCode: string;
  let sessionId: string | null = null;

  if (input.mode === "template") {
    const cloneResult = await cloneTemplateForUser(input.templateId, user.id);
    if (!cloneResult.ok) {
      // Rollback role flip so the user isn't stranded as DM with no campaign.
      const { error: rollbackErr } = await supabase
        .from("users")
        .update({ role: prevRole })
        .eq("id", user.id);
      if (rollbackErr) {
        return {
          ok: false,
          code: "clone_failed_no_rollback",
          message: `Clone failed (${cloneResult.code}); rollback also failed (${rollbackErr.message}).`,
        };
      }
      // Map clone-template codes to our result surface.
      if (cloneResult.code === "missing_monsters") {
        return {
          ok: false,
          code: "missing_monsters",
          missingMonsters: cloneResult.missingMonsters,
        };
      }
      if (cloneResult.code === "not_found") {
        return { ok: false, code: "template_not_found" };
      }
      return {
        ok: false,
        code: "clone_failed",
        message:
          cloneResult.code === "unknown" ? cloneResult.message : cloneResult.code,
      };
    }
    campaignId = cloneResult.campaignId;
    joinCode = cloneResult.joinCode;
    sessionId = cloneResult.sessionId;
  } else {
    // Blank campaign path.
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "create_campaign_with_settings",
      {
        p_owner_id: user.id,
        p_name: input.campaignName.trim(),
        p_description: null,
        p_game_system: "5e",
        p_party_level: input.partyLevel,
        p_theme: null,
        p_is_oneshot: false,
      },
    );
    if (rpcErr || !rpcData) {
      // Rollback — same pattern as template path.
      const { error: rollbackErr } = await supabase
        .from("users")
        .update({ role: prevRole })
        .eq("id", user.id);
      if (rollbackErr) {
        return {
          ok: false,
          code: "clone_failed_no_rollback",
          message: `Create failed (${rpcErr?.message ?? "rpc returned null"}); rollback also failed (${rollbackErr.message}).`,
        };
      }
      return {
        ok: false,
        code: "clone_failed",
        message: rpcErr?.message ?? "create_campaign_with_settings returned null",
      };
    }
    const envelope = rpcData as {
      campaign_id?: string;
      join_code?: string;
    };
    if (!envelope.campaign_id || !envelope.join_code) {
      return { ok: false, code: "clone_failed", message: "Malformed RPC envelope" };
    }
    campaignId = envelope.campaign_id;
    joinCode = envelope.join_code;
    // Blank path has no auto-session (templates seed one; blank lets the
    // user create their own when ready).
    sessionId = null;
  }

  // ── 3. Analytics (D14 — server-side, post-success only) ──
  //
  // Emit AFTER the transactional unit (flip + create) has succeeded so
  // a failed path doesn't pollute the funnel. Fire-and-forget from the
  // caller's POV — captureError inside trackServerEvent handles its own
  // failures.
  trackServerEvent("dm_upsell:role_upgraded_to_dm", {
    userId: user.id,
    properties: {
      from: prevRole,
      to: "both",
      via: "become_dm_wizard",
    },
  });
  trackServerEvent("dm_upsell:first_campaign_created", {
    userId: user.id,
    properties: {
      campaignId,
      mode: input.mode,
      templateId: input.mode === "template" ? input.templateId : null,
    },
  });

  return {
    ok: true,
    campaignId,
    joinCode,
    sessionId,
    prevRole,
    newRole: "both",
  };
}
