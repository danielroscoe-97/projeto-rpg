"use server";

/**
 * `upgradePlayerIdentity` — Story 01-E saga (the "upgrade" saga).
 *
 * Promotes an anonymous (guest/anon-auth) user to an authenticated user,
 * preserving their UUID via the design contract DC1 of Epic 01:
 * `supabase.auth.updateUser` keeps the same `auth.users.id` when an anon
 * session adds a password+email, so `auth.uid()` survives the transition.
 *
 * ### Architecture split — critical
 *
 * Phase 2 (`supabase.auth.updateUser`) MUST be called client-side with the
 * anon user's own JWT. Supabase does not expose a server-side "promote anon
 * to auth" admin API. Flow:
 *
 *   1. Client calls `supabase.auth.updateUser({ email, password })` — gets
 *      a new authenticated JWT back.
 *   2. Client calls `POST /api/player-identity/upgrade` carrying that JWT.
 *   3. Server route re-validates then invokes `upgradePlayerIdentity` below.
 *
 * This function therefore implements ONLY Phase 1 (pre-flight, zero side
 * effects) and Phase 3 (data migration, idempotent forward-recovery). It
 * does NOT call any auth API — the caller has already promoted itself.
 *
 * ### Idempotency contract (Phase 3)
 *
 * Every Phase 3 step is idempotent:
 * - INSERTs use `ON CONFLICT DO UPDATE/NOTHING`.
 * - UPDATEs use WHERE filters that turn no-ops after success.
 * - Migrating a guest character is opt-in via `guestCharacter` param; the
 *   recovery endpoint omits it, so a retry won't duplicate the character.
 *
 * On any Phase 3 step failure we set `users.upgrade_failed_at = now()` and
 * return `{ ok: false, code: "migration_partial_failure", retryable: true }`.
 * The recovery endpoint `/api/player-identity/upgrade-recovery` re-invokes
 * this function (with `guestCharacter` omitted) — every step re-runs, but
 * each one no-ops when already applied, so the net effect is "resume from
 * the failing step".
 *
 * ### Retry budget
 *
 * We intentionally do NOT add a retry-counter column. Instead we rely on:
 * - `upgrade_failed_at` populated while the saga is unfinished.
 * - The existing `idx_users_upgrade_failed_at` partial index (migration 144).
 * - An external monitor alerting on rows where
 *   `upgrade_failed_at < now() - interval '1 hour'` — simplest correct
 *   design, avoids a schema change this story doesn't own. The 3x retry
 *   budget is enforced client-side (the Epic 02 dashboard will expose a
 *   "Try again" button that counts attempts in localStorage).
 *
 * ### Returned shape
 *
 * Discriminated union `Result` — callers `switch (res.code)` on failure.
 * We never throw for expected failures (session not found, invalid creds,
 * partial migration); we throw only for truly unexpected conditions.
 */

import { createServiceClient } from "./server";
import { migrateGuestCharacterToAuth } from "./character-portability";
import type { Combatant } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UpgradeCredentials {
  email: string;
  /**
   * Password — required for email-mode upgrades (Phase 1 validates length).
   * For `mode: "oauth"` we never write passwords (the identity is provided
   * by Google); callers pass a placeholder or omit the field, and Phase 1
   * skips the length check.
   */
  password?: string;
  displayName?: string;
}

/**
 * How the caller obtained authenticated credentials.
 *
 * - `email`: classic email + password signup. Pre-Wave-2 this was implicit.
 *   The server admin-promotes the anon user (updateUserById) on behalf of
 *   the client — removes the half-upgraded race where client runs updateUser,
 *   then the server POST fails leaving stranded credentials (C2 fix).
 *
 * - `oauth`: user already linked a Google (or other OIDC) identity via
 *   Supabase hosted OAuth flow. The Supabase session now has the real
 *   user id + email; no credential update is needed. The saga runs Phase 3
 *   (migration) only — no password or email writes (C1 fix: avoids the
 *   placeholder `__oauth__@pocketdm.com.br` credentials polluting user data).
 */
export type UpgradeMode = "email" | "oauth";

export interface UpgradePlayerIdentityParams {
  /** Stable `session_tokens.id` — survives anon_user_id regeneration. */
  sessionTokenId: string;
  /** Caller's `auth.uid()` after client-side `updateUser` completed. */
  callerUserId: string;
  credentials: UpgradeCredentials;
  /**
   * Default `email` preserves the pre-Wave-2 behavior. Pass `oauth` to skip
   * credential validation and rely on the caller's session for email.
   */
  mode?: UpgradeMode;
  /**
   * Optional Combatant (Zustand guest store shape). If provided, saga step 10
   * migrates it to a new `player_characters` row owned by the user. Omitted
   * on recovery retries to keep the step idempotent.
   */
  guestCharacter?: Combatant;
}

export interface UpgradeMigrated {
  playerCharactersPromoted: number;
  campaignMembersInserted: number;
  guestCharacterMigrated: boolean;
}

export type UpgradeErrorCode =
  | "email_already_exists"
  | "invalid_credentials"
  | "session_token_not_found"
  | "already_authenticated"
  | "update_user_failed"
  | "migration_partial_failure"
  | "internal";

export type UpgradeResult =
  | { ok: true; userId: string; migrated: UpgradeMigrated }
  | {
      ok: false;
      code: UpgradeErrorCode;
      retryable: boolean;
      message: string;
      details?: unknown;
    };

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Intentionally permissive email regex — full RFC 5322 is infamous and we
 * defer real checks to Supabase Auth. Here we only reject the obviously
 * malformed shapes (no "@", no domain) to give a fast-fail path in Phase 1.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email);
}

function isValidPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

// ---------------------------------------------------------------------------
// Result helpers — keep the discriminated union construction tidy.
// ---------------------------------------------------------------------------

function fail(
  code: UpgradeErrorCode,
  message: string,
  retryable: boolean,
  details?: unknown,
): UpgradeResult {
  return { ok: false, code, retryable, message, details };
}

function zeroMigrated(): UpgradeMigrated {
  return {
    playerCharactersPromoted: 0,
    campaignMembersInserted: 0,
    guestCharacterMigrated: false,
  };
}

// ---------------------------------------------------------------------------
// Core saga
// ---------------------------------------------------------------------------

/**
 * Run Phase 1 (pre-flight) and Phase 3 (data migration) of the upgrade saga.
 *
 * Phase 2 (`updateUser`) is assumed already complete client-side — we validate
 * `callerUserId` matches the session_token's anon_user_id or user_id.
 */
export async function upgradePlayerIdentity(
  params: UpgradePlayerIdentityParams,
): Promise<UpgradeResult> {
  const { sessionTokenId, callerUserId, credentials, guestCharacter } = params;
  const mode: UpgradeMode = params.mode ?? "email";

  // --- Phase 1: Pre-flight (no side effects) ---------------------------------

  if (typeof sessionTokenId !== "string" || !UUID_RE.test(sessionTokenId)) {
    return fail(
      "session_token_not_found",
      "sessionTokenId inválido",
      false,
    );
  }

  if (typeof callerUserId !== "string" || !UUID_RE.test(callerUserId)) {
    return fail(
      "session_token_not_found",
      "callerUserId inválido",
      false,
    );
  }

  if (!isValidEmail(credentials?.email)) {
    return fail(
      "invalid_credentials",
      "Email inválido",
      false,
    );
  }

  // Password check only for email-mode upgrades. In oauth mode the
  // identity is established by the OAuth provider — we never touch the
  // auth.users password column, so requiring one here would be incorrect.
  if (mode === "email" && !isValidPassword(credentials?.password)) {
    return fail(
      "invalid_credentials",
      `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
      false,
    );
  }

  const supabase = createServiceClient();

  // Lookup session_token. `id` is stable (DC4) — use it as the primary key.
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, anon_user_id, user_id, session_id, player_name")
    .eq("id", sessionTokenId)
    .maybeSingle();

  if (tokenError) {
    return fail(
      "internal",
      `Falha ao buscar session_token: ${tokenError.message}`,
      true,
      tokenError,
    );
  }

  if (!tokenRow) {
    return fail(
      "session_token_not_found",
      "Session token não encontrado",
      false,
    );
  }

  // Caller must own the token via either anon or auth identity.
  const ownsViaAnon = tokenRow.anon_user_id === callerUserId;
  const ownsViaAuth = tokenRow.user_id === callerUserId;
  if (!ownsViaAnon && !ownsViaAuth) {
    return fail(
      "session_token_not_found",
      "Caller não é dono do session_token",
      false,
    );
  }

  // --- Idempotency: already authenticated AND has users row? ---------------
  // If user_id is already populated and matches caller, and public.users row
  // exists, the saga has already completed — return a no-op success.
  if (tokenRow.user_id === callerUserId) {
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("id", callerUserId)
      .maybeSingle();

    if (existingUserError) {
      return fail(
        "internal",
        `Falha ao verificar users: ${existingUserError.message}`,
        true,
        existingUserError,
      );
    }

    if (existingUser) {
      // Fully migrated previously. Nothing to do.
      return {
        ok: true,
        userId: callerUserId,
        migrated: zeroMigrated(),
      };
    }
    // user_id set but no users row — partial previous failure. Continue to
    // Phase 3, which is idempotent and will backfill the users row.
  }

  // --- Phase 3: Data migration --------------------------------------------
  return await runPhase3({
    supabase,
    sessionTokenId,
    callerUserId,
    tokenRow: {
      player_name: tokenRow.player_name,
    },
    credentials,
    guestCharacter,
  });
}

// ---------------------------------------------------------------------------
// Phase 3 — extracted so the recovery endpoint can re-run it directly.
// ---------------------------------------------------------------------------

interface Phase3Args {
  supabase: ReturnType<typeof createServiceClient>;
  sessionTokenId: string;
  callerUserId: string;
  tokenRow: { player_name: string | null };
  credentials: UpgradeCredentials;
  guestCharacter?: Combatant;
}

async function runPhase3(args: Phase3Args): Promise<UpgradeResult> {
  const { supabase, sessionTokenId, callerUserId, tokenRow, credentials, guestCharacter } = args;

  // Step 6 — UPSERT public.users --------------------------------------------
  //
  // display_name precedence: credentials.displayName > session_tokens.player_name > null.
  // `role` defaults to 'player' (the whole saga is about promoting a guest
  // player; DMs sign up through the normal flow).
  const displayName = credentials.displayName ?? tokenRow.player_name ?? null;

  const usersUpsertPayload = {
    id: callerUserId,
    email: credentials.email,
    display_name: displayName,
    role: "player" as const,
  };

  const { error: usersError } = await supabase
    .from("users")
    .upsert(usersUpsertPayload, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

  if (usersError) {
    await markUpgradeFailed(supabase, callerUserId);
    return fail(
      "migration_partial_failure",
      `Falha no upsert de users: ${usersError.message}`,
      true,
      { failed_step: 6, error: usersError },
    );
  }

  // Step 7 — UPDATE session_tokens.user_id ---------------------------------
  //
  // Idempotent: the second call is a no-op when user_id is already set.
  const { error: tokenUpdateError } = await supabase
    .from("session_tokens")
    .update({ user_id: callerUserId })
    .eq("id", sessionTokenId)
    .is("user_id", null);

  if (tokenUpdateError) {
    await markUpgradeFailed(supabase, callerUserId);
    return fail(
      "migration_partial_failure",
      `Falha ao atualizar session_tokens: ${tokenUpdateError.message}`,
      true,
      { failed_step: 7, error: tokenUpdateError },
    );
  }

  // Step 8 — Promote soft claims to hard claims ----------------------------
  //
  // Any player_characters soft-claimed via one of this user's session_tokens
  // get promoted: user_id set, claimed_by_session_token cleared. We fetch the
  // token IDs first to keep the UPDATE's WHERE clause simple and the
  // post-update row count trustworthy.
  const { data: userTokens, error: tokensListError } = await supabase
    .from("session_tokens")
    .select("id")
    .eq("user_id", callerUserId);

  if (tokensListError) {
    await markUpgradeFailed(supabase, callerUserId);
    return fail(
      "migration_partial_failure",
      `Falha ao listar session_tokens do user: ${tokensListError.message}`,
      true,
      { failed_step: 8, error: tokensListError },
    );
  }

  const userTokenIds = (userTokens ?? []).map((t) => t.id);

  let playerCharactersPromoted = 0;
  if (userTokenIds.length > 0) {
    const { data: promoted, error: promoteError } = await supabase
      .from("player_characters")
      .update({
        user_id: callerUserId,
        claimed_by_session_token: null,
      })
      .in("claimed_by_session_token", userTokenIds)
      .select("id");

    if (promoteError) {
      await markUpgradeFailed(supabase, callerUserId);
      return fail(
        "migration_partial_failure",
        `Falha ao promover player_characters: ${promoteError.message}`,
        true,
        { failed_step: 8, error: promoteError },
      );
    }

    playerCharactersPromoted = promoted?.length ?? 0;
  }

  // Step 9 — Auto-insert campaign_members ----------------------------------
  //
  // For every active session_token the user owns, find the campaign and
  // insert a membership (role=player, status=active, invited_by=campaign
  // owner). ON CONFLICT makes repeat runs safe.
  let campaignMembersInserted = 0;
  if (userTokenIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("session_tokens")
      .select("session_id, sessions(campaign_id, campaigns(id, owner_id))")
      .eq("user_id", callerUserId)
      .eq("is_active", true);

    if (sessionsError) {
      await markUpgradeFailed(supabase, callerUserId);
      return fail(
        "migration_partial_failure",
        `Falha ao buscar campanhas do user: ${sessionsError.message}`,
        true,
        { failed_step: 9, error: sessionsError },
      );
    }

    // Normalize possibly-nested rows. Supabase returns either a single object
    // or an array depending on the relationship; we flatten defensively.
    type NestedSession = {
      campaign_id?: string | null;
      campaigns?:
        | { id: string; owner_id: string }
        | Array<{ id: string; owner_id: string }>
        | null;
    };
    type SessionRow = {
      session_id: string | null;
      sessions?: NestedSession | NestedSession[] | null;
    };

    const memberships = new Map<string, { campaign_id: string; invited_by: string }>();
    for (const row of (sessionRows ?? []) as SessionRow[]) {
      const sessions = Array.isArray(row.sessions) ? row.sessions : row.sessions ? [row.sessions] : [];
      for (const s of sessions) {
        const cid = s.campaign_id ?? null;
        const camps = Array.isArray(s.campaigns) ? s.campaigns : s.campaigns ? [s.campaigns] : [];
        const camp = camps[0];
        if (!cid || !camp) continue;
        // Dedupe by campaign_id so a user in multiple sessions of the same
        // campaign only gets one membership insert attempted.
        if (!memberships.has(cid)) {
          memberships.set(cid, { campaign_id: cid, invited_by: camp.owner_id });
        }
      }
    }

    if (memberships.size > 0) {
      const payload = Array.from(memberships.values()).map((m) => ({
        campaign_id: m.campaign_id,
        user_id: callerUserId,
        role: "player" as const,
        invited_by: m.invited_by,
        status: "active" as const,
      }));

      const { data: inserted, error: insertMembersError } = await supabase
        .from("campaign_members")
        .upsert(payload, {
          onConflict: "campaign_id,user_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertMembersError) {
        await markUpgradeFailed(supabase, callerUserId);
        return fail(
          "migration_partial_failure",
          `Falha ao inserir campaign_members: ${insertMembersError.message}`,
          true,
          { failed_step: 9, error: insertMembersError },
        );
      }

      campaignMembersInserted = inserted?.length ?? 0;
    }
  }

  // Step 10 — Migrate guest character (optional) ---------------------------
  let guestCharacterMigrated = false;
  let newlyMigratedCharacterId: string | null = null;
  if (guestCharacter) {
    try {
      const migrated = await migrateGuestCharacterToAuth(guestCharacter, callerUserId, {
        setAsDefault: true,
      });
      guestCharacterMigrated = true;
      newlyMigratedCharacterId = migrated.id;
    } catch (err) {
      await markUpgradeFailed(supabase, callerUserId);
      return fail(
        "migration_partial_failure",
        `Falha ao migrar guest character: ${err instanceof Error ? err.message : String(err)}`,
        true,
        { failed_step: 10, error: err },
      );
    }
  }

  // Step 11 — Set default_character_id + last_session_at -------------------
  //
  // Priority for default_character_id:
  //   (a) newly migrated guest character (already set by
  //       migrateGuestCharacterToAuth with setAsDefault:true — but we
  //       re-confirm for robustness),
  //   (b) most-recently-promoted player_character (step 8 output),
  //   (c) skip if neither exists.
  const userUpdatePayload: Record<string, unknown> = {
    last_session_at: new Date().toISOString(),
    // Clear any prior failure marker on success.
    upgrade_failed_at: null,
  };

  if (!newlyMigratedCharacterId && playerCharactersPromoted > 0) {
    // Re-query most recent promoted character. Safe because step 8 already
    // set user_id; we just need the ID that sorts newest.
    const { data: mostRecent, error: pickError } = await supabase
      .from("player_characters")
      .select("id")
      .eq("user_id", callerUserId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pickError && mostRecent?.id) {
      // Only set if user has no default yet (don't override a prior explicit choice).
      const { data: currentUser } = await supabase
        .from("users")
        .select("default_character_id")
        .eq("id", callerUserId)
        .maybeSingle();
      if (currentUser && !currentUser.default_character_id) {
        userUpdatePayload.default_character_id = mostRecent.id;
      }
    }
  }

  const { error: userFinalError } = await supabase
    .from("users")
    .update(userUpdatePayload)
    .eq("id", callerUserId);

  if (userFinalError) {
    await markUpgradeFailed(supabase, callerUserId);
    return fail(
      "migration_partial_failure",
      `Falha ao atualizar users (last_session_at): ${userFinalError.message}`,
      true,
      { failed_step: 11, error: userFinalError },
    );
  }

  // Step 12 — Broadcast `player:identity-upgraded` --------------------------
  //
  // Best-effort: if the broadcast fails we don't fail the saga. The DM
  // falls back to presence/polling to observe the membership change.
  await broadcastIdentityUpgraded(supabase, {
    sessionTokenId,
    userId: callerUserId,
    playerName: tokenRow.player_name ?? null,
    displayName,
  }).catch(() => {
    // Swallow — realtime is not a correctness dependency of Phase 3.
  });

  return {
    ok: true,
    userId: callerUserId,
    migrated: {
      playerCharactersPromoted,
      campaignMembersInserted,
      guestCharacterMigrated,
    },
  };
}

// ---------------------------------------------------------------------------
// Recovery — re-run Phase 3 when a previous attempt left us in a partial
// state. Designed to be called after the first request returned
// `migration_partial_failure`.
// ---------------------------------------------------------------------------

export async function recoverUpgradePlayerIdentity(
  sessionTokenId: string,
  callerUserId: string,
): Promise<UpgradeResult> {
  if (typeof sessionTokenId !== "string" || !UUID_RE.test(sessionTokenId)) {
    return fail("session_token_not_found", "sessionTokenId inválido", false);
  }
  if (typeof callerUserId !== "string" || !UUID_RE.test(callerUserId)) {
    return fail("session_token_not_found", "callerUserId inválido", false);
  }

  const supabase = createServiceClient();

  // Read the failed state so we can reconstruct credentials-lite. For the
  // recovery path we only need email (already on auth.users via updateUser)
  // and displayName (already on public.users if prior step 6 succeeded, or
  // fallback to session_tokens.player_name).
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, anon_user_id, user_id, session_id, player_name")
    .eq("id", sessionTokenId)
    .maybeSingle();

  if (tokenError) {
    return fail("internal", `Falha ao buscar session_token: ${tokenError.message}`, true, tokenError);
  }

  if (!tokenRow) {
    return fail("session_token_not_found", "Session token não encontrado", false);
  }

  if (tokenRow.user_id !== callerUserId && tokenRow.anon_user_id !== callerUserId) {
    return fail("session_token_not_found", "Caller não é dono do session_token", false);
  }

  // Pull email + display_name from what exists. Prefer public.users (set by
  // step 6 on first attempt) then fall back to auth.users via admin API.
  const { data: existingUser } = await supabase
    .from("users")
    .select("email, display_name")
    .eq("id", callerUserId)
    .maybeSingle();

  let email = existingUser?.email ?? null;
  let displayName = existingUser?.display_name ?? tokenRow.player_name ?? null;

  if (!email) {
    // Fall back to auth.admin — the user exists (updateUser completed Phase 2),
    // we just can't read their email via the public schema yet because step 6
    // never succeeded.
    try {
      const { data: adminUser } = await supabase.auth.admin.getUserById(callerUserId);
      email = adminUser?.user?.email ?? null;
      if (!displayName) {
        const meta = adminUser?.user?.user_metadata as { display_name?: string } | undefined;
        displayName = meta?.display_name ?? null;
      }
    } catch {
      // If admin lookup fails, we can't proceed — the auth user is gone or
      // the service-role key is misconfigured.
    }
  }

  if (!email) {
    return fail(
      "internal",
      "Não foi possível recuperar email do user para retry",
      false,
    );
  }

  // Recovery deliberately omits guestCharacter — the first attempt either
  // succeeded at step 10 (guestCharacterMigrated=true) and we don't want to
  // double-insert, or failed earlier (user never had one).
  return await runPhase3({
    supabase,
    sessionTokenId,
    callerUserId,
    tokenRow: { player_name: tokenRow.player_name },
    credentials: { email, password: "unused-on-recovery-dummy-aaaaaaaa", displayName: displayName ?? undefined },
    guestCharacter: undefined,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function markUpgradeFailed(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  // Best-effort: ignore errors. If users row doesn't exist yet (step 6 failed),
  // the UPDATE simply matches 0 rows — a later successful retry will create
  // it fresh without the upgrade_failed_at marker.
  try {
    await supabase
      .from("users")
      .update({ upgrade_failed_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // Swallow — the caller is already returning a failure result.
  }
}

interface BroadcastPayload {
  sessionTokenId: string;
  userId: string;
  playerName: string | null;
  displayName: string | null;
}

/**
 * Emits `player:identity-upgraded` on every campaign channel the user belongs
 * to. Used to wake up DM dashboards so they re-render the player row with the
 * new display_name + authenticated badge.
 */
async function broadcastIdentityUpgraded(
  supabase: ReturnType<typeof createServiceClient>,
  payload: BroadcastPayload,
): Promise<void> {
  // Find every campaign where the user just became a member.
  const { data: memberships, error } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("user_id", payload.userId);

  if (error || !memberships || memberships.length === 0) return;

  const timestamp = new Date().toISOString();
  for (const m of memberships as Array<{ campaign_id: string }>) {
    const channel = supabase.channel(`campaign:${m.campaign_id}`);
    try {
      await channel.send({
        type: "broadcast",
        event: "player:identity-upgraded",
        payload: {
          event: "player:identity-upgraded",
          sessionTokenId: payload.sessionTokenId,
          userId: payload.userId,
          campaignId: m.campaign_id,
          playerName: payload.playerName,
          displayName: payload.displayName,
          timestamp,
        },
      });
    } finally {
      // Remove the channel — we don't keep a subscription on the server.
      await supabase.removeChannel(channel).catch(() => {});
    }
  }
}
