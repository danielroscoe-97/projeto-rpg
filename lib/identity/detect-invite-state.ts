import type { User } from "@supabase/supabase-js";
import { createServiceClient, getAuthUser } from "@/lib/supabase/server";

/**
 * Shape of a campaign_invites row enriched with the joined campaign + DM info
 * that the `/invite/[token]` UI actually needs (name, DM display name/email).
 *
 * The DB row has more columns (invited_by, email, created_at, ...) — we only
 * surface what the UI consumes so consumers don't get tempted to read fields
 * we don't guarantee are fetched.
 */
export interface CampaignInviteSummary {
  id: string;
  campaignId: string;
  campaignName: string;
  /**
   * DM display name, falls back to email when display_name is null.
   *
   * `null` when BOTH display_name AND email are absent — consumers MUST
   * translate `null` to a locale-appropriate fallback (e.g. "DM" / "Mestre")
   * via i18n. This lib intentionally refuses to embed a hardcoded string
   * (M6 code review): copy belongs to the UI layer, not to a server utility.
   */
  dmName: string | null;
  /** Invite recipient email (empty string if the invite row has no email). */
  email: string;
  expiresAt: string;
  /** 'pending' | 'accepted' | 'expired' per migration 025. */
  status: string;
}

/**
 * Discriminated union returned by `detectInviteState`.
 *
 * Each branch carries exactly the data `/invite/[token]` needs to render:
 *   - `invalid`                       — error screen
 *   - `guest`                         — landing + AuthModal (signup default)
 *   - `auth`                          — CharacterPickerModal
 *   - `auth-with-invite-pending`      — CharacterPickerModal w/ "Bem-vindo de volta, {displayName}"
 *
 * Why `auth` and `auth-with-invite-pending` are split:
 *   `auth-with-invite-pending` is returning-user UX (the user already has a
 *   display_name on file, so we can greet them by name). `auth` is the
 *   fallback when the users row has no display_name yet (just-created account,
 *   email-only signup, etc). Callers render the same picker flow; only the
 *   preamble changes.
 *
 * ### `isAnonymous` field (M8 code review)
 *
 * Both `auth` branches carry `isAnonymous: boolean` so the consumer can
 * distinguish "real logged-in user" from "anon-session user" in ONE check
 * (instead of having to inspect `user.is_anonymous` out-of-band). An anon
 * user who clicks an /invite link still hits the auth branches because they
 * DO have a Supabase User object — but the UX probably wants to show
 * "create account" CTA before letting them accept the invite.
 */
export type InviteState =
  | { state: "invalid"; reason: "not_found" | "expired" | "accepted" }
  | { state: "guest"; invite: CampaignInviteSummary }
  | {
      state: "auth";
      invite: CampaignInviteSummary;
      user: User;
      /** True when `user.is_anonymous === true` (Supabase anon session). */
      isAnonymous: boolean;
    }
  | {
      state: "auth-with-invite-pending";
      invite: CampaignInviteSummary;
      user: User;
      displayName: string;
      /** True when `user.is_anonymous === true` (Supabase anon session). */
      isAnonymous: boolean;
    };

/**
 * Detect the state of an `/invite/[token]` page.
 *
 * Validates the token against `campaign_invites` (via service client — the
 * invite-lookup path has to bypass RLS, because guests have no auth session
 * yet), then branches based on whether the caller is authenticated and
 * whether we have a display_name we can greet them with.
 *
 * Auth detection uses the cookie-aware `getAuthUser()` so the same render can
 * safely detect both anon-cookie and auth-cookie callers without extra
 * plumbing from the page.
 *
 * Edge cases handled:
 *   - Token missing / malformed / not in DB  → `invalid.not_found`
 *   - `status = 'accepted'`                  → `invalid.accepted`
 *   - `status = 'expired'` OR `expires_at < NOW()` (we check BOTH because
 *     the expiry-sweeper trigger (supabase/trigger/invite-expiry.ts) runs
 *     periodically, not on read — an unswept expired row still has
 *     `status = 'pending'`)                  → `invalid.expired`
 *   - Valid invite, no auth user            → `guest`
 *   - Valid invite, auth user, no display_name → `auth`
 *   - Valid invite, auth user, has display_name → `auth-with-invite-pending`
 */
export async function detectInviteState(token: string): Promise<InviteState> {
  // Reject obviously-malformed input before hitting the DB. UUIDs here would
  // be nice to validate, but historically tokens have been UUIDs *and* hex;
  // we keep it permissive (length > 0) and let the DB miss handle the rest.
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { state: "invalid", reason: "not_found" };
  }

  const service = createServiceClient();

  const { data: inviteRow, error: inviteError } = await service
    .from("campaign_invites")
    .select(
      "id, campaign_id, email, status, expires_at, campaigns(name, users(display_name, email))",
    )
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !inviteRow) {
    return { state: "invalid", reason: "not_found" };
  }

  // Shape guard — maybeSingle returns a typed row but we also get surprise
  // shapes when the FK join fails (deleted campaign). Treat missing campaign
  // as not_found rather than letting an unresolvable invite render blank.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's generated types don't model joined shapes cleanly
  const row = inviteRow as any;
  const campaignJoin = row.campaigns as
    | { name: string; users: { display_name: string | null; email: string } | null }
    | null;

  if (!campaignJoin) {
    return { state: "invalid", reason: "not_found" };
  }

  // Accepted check comes first — an accepted invite is "used", distinct UX
  // from "expired". If the backfill ever introduces `accepted_at`, we'd
  // swap this to `row.accepted_at !== null`; today the table just has
  // `status = 'accepted'` (migration 025).
  if (row.status === "accepted") {
    return { state: "invalid", reason: "accepted" };
  }

  // Expired check — either explicitly marked or implicitly past `expires_at`.
  const nowMs = Date.now();
  const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.status === "expired" || (expiresMs > 0 && expiresMs < nowMs)) {
    return { state: "invalid", reason: "expired" };
  }

  // M6: no hardcoded "DM" fallback — consumer translates null via i18n.
  // Treat empty strings / whitespace-only as "absent" so the consumer's
  // null check is the single source of truth for "show fallback copy".
  const dmDisplayCandidate =
    typeof campaignJoin.users?.display_name === "string" &&
    campaignJoin.users.display_name.trim().length > 0
      ? campaignJoin.users.display_name
      : typeof campaignJoin.users?.email === "string" &&
          campaignJoin.users.email.trim().length > 0
        ? campaignJoin.users.email
        : null;

  const invite: CampaignInviteSummary = {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: campaignJoin.name,
    dmName: dmDisplayCandidate,
    email: row.email ?? "",
    expiresAt: row.expires_at,
    status: row.status,
  };

  // Auth detection — cookie-aware; returns null for unauthenticated callers.
  // Anon-session callers still have a User object (is_anonymous=true), so we
  // treat them as "auth" here and expose `isAnonymous` on the returned state
  // (M8) so the UI can distinguish "real account" from "anon account" in
  // one check.
  const authUser = await getAuthUser();

  if (!authUser) {
    return { state: "guest", invite };
  }

  // Fetch display_name from public.users (the auth.users row doesn't have
  // our custom display_name field). Absence of a users row is fine — just
  // means this auth user hasn't been onboarded yet.
  const { data: userRow } = await service
    .from("users")
    .select("display_name")
    .eq("id", authUser.id)
    .maybeSingle();

  const displayName =
    typeof userRow?.display_name === "string" && userRow.display_name.trim().length > 0
      ? userRow.display_name
      : null;

  // M8: hoist is_anonymous into the discriminated union so consumers don't
  // have to inspect user.is_anonymous separately (Supabase's User type marks
  // the field as optional; we coerce to strict boolean for API stability).
  const isAnonymous = authUser.is_anonymous === true;

  if (displayName) {
    return {
      state: "auth-with-invite-pending",
      invite,
      user: authUser,
      displayName,
      isAnonymous,
    };
  }

  return { state: "auth", invite, user: authUser, isAnonymous };
}
