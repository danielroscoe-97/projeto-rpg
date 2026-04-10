"use server";

import { createClient } from "./server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";

// ── Local types ──────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  ruleset_version: string;
  is_active: boolean;
  dm_plan: string;
  description: string | null;
  scheduled_for: string | null;
  session_number: number | null;
  prep_notes: string | null;
  recap: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionData {
  name: string;
  description?: string | null;
  scheduled_for?: string | null;
  prep_notes?: string | null;
  status?: string;
  is_active?: boolean;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new session for a campaign.
 * session_number is auto-set by the DB trigger.
 */
export async function createSession(
  campaignId: string,
  userId: string,
  data: CreateSessionData
): Promise<{ sessionId: string } | null> {
  const supabase = await createClient();

  try {
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        campaign_id: campaignId,
        owner_id: userId,
        name: data.name,
        description: data.description ?? null,
        scheduled_for: data.scheduled_for ?? null,
        prep_notes: data.prep_notes ?? null,
        status: data.status ?? "planned",
        is_active: data.is_active ?? false,
      })
      .select("id")
      .single();

    if (error || !session) {
      captureError(error ?? new Error("No session returned"), {
        component: "campaign-sessions",
        action: "createSession",
        category: "database",
        extra: { campaignId, userId },
      });
      return null;
    }

    trackServerEvent("session:created", {
      userId,
      properties: {
        campaign_id: campaignId,
        session_id: session.id,
        status: data.status ?? "planned",
      },
    });

    return { sessionId: session.id };
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "createSession",
      category: "database",
      extra: { campaignId, userId },
    });
    return null;
  }
}

/**
 * Updates session fields (name, description, scheduled_for, prep_notes).
 * RLS enforced via the authenticated user's client.
 */
export async function updateSession(
  sessionId: string,
  data: Partial<{
    name: string;
    description: string | null;
    scheduled_for: string | null;
    prep_notes: string | null;
  }>
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("sessions")
      .update(data)
      .eq("id", sessionId);

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "updateSession",
        category: "database",
        extra: { sessionId },
      });
      return false;
    }

    return true;
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "updateSession",
      category: "database",
      extra: { sessionId },
    });
    return false;
  }
}

/**
 * Fetches all planned sessions for a campaign, ordered by scheduled date.
 */
export async function getPlannedSessions(
  campaignId: string
): Promise<SessionRow[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "planned")
      .order("scheduled_for", { ascending: true, nullsFirst: false });

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "getPlannedSessions",
        category: "database",
        extra: { campaignId },
      });
      return [];
    }

    return (data as SessionRow[]) ?? [];
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "getPlannedSessions",
      category: "database",
      extra: { campaignId },
    });
    return [];
  }
}

/**
 * Starts a session (sets status='active', is_active=true).
 */
export async function startSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "active", is_active: true })
      .eq("id", sessionId);

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "startSession",
        category: "database",
        extra: { sessionId },
      });
      return false;
    }

    trackServerEvent("session:started", {
      properties: { session_id: sessionId },
    });

    return true;
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "startSession",
      category: "database",
      extra: { sessionId },
    });
    return false;
  }
}

/**
 * Cancels a session (sets status='cancelled', is_active=false).
 */
export async function cancelSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "cancelled", is_active: false })
      .eq("id", sessionId);

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "cancelSession",
        category: "database",
        extra: { sessionId },
      });
      return false;
    }

    trackServerEvent("session:cancelled", {
      properties: { session_id: sessionId },
    });

    return true;
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "cancelSession",
      category: "database",
      extra: { sessionId },
    });
    return false;
  }
}

/**
 * Completes a session (sets status='completed', is_active=false, optional recap).
 */
export async function completeSession(
  sessionId: string,
  recap?: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        is_active: false,
        ...(recap !== undefined ? { recap } : {}),
      })
      .eq("id", sessionId);

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "completeSession",
        category: "database",
        extra: { sessionId },
      });
      return false;
    }

    trackServerEvent("session:completed", {
      properties: { session_id: sessionId, has_recap: !!recap },
    });

    return true;
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "completeSession",
      category: "database",
      extra: { sessionId },
    });
    return false;
  }
}

/**
 * Fetches the next planned session for a campaign.
 * Returns the earliest scheduled planned session, with nulls sorted last.
 */
export async function getNextPlannedSession(
  campaignId: string
): Promise<SessionRow | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "planned")
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      captureError(error, {
        component: "campaign-sessions",
        action: "getNextPlannedSession",
        category: "database",
        extra: { campaignId },
      });
      return null;
    }

    return data as SessionRow | null;
  } catch (err) {
    captureError(err, {
      component: "campaign-sessions",
      action: "getNextPlannedSession",
      category: "database",
      extra: { campaignId },
    });
    return null;
  }
}
