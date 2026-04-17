export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { FeedbackClient } from "./FeedbackClient";

/**
 * Explicit noindex — the page exposes sessionName + dmName to anyone
 * holding a valid session_tokens.token, so we must keep it out of any
 * public index (Google, Bing, Archive.org, etc.).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface FeedbackPageProps {
  params: Promise<{ token: string }>;
}

type EndedEncounter = {
  id: string;
  name: string | null;
  ended_at: string;
};

type PageData = {
  token: string;
  sessionName: string;
  dmName: string | null;
  encounters: EndedEncounter[];
  recapShortCode: string | null;
};

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { token } = await params;
  const t = await getTranslations("feedback");

  // Service client — validating a shareable token that has no auth session.
  const supabase = createServiceClient();

  // --- Validate token ---
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, session_id, is_active")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return (
      <ErrorScreen
        title={t("retro_error_invalid_title")}
        detail={t("retro_error_invalid_detail")}
        backLabel={t("retro_back_home")}
      />
    );
  }

  if (!tokenRow.is_active) {
    return (
      <ErrorScreen
        title={t("retro_error_expired_title")}
        detail={t("retro_error_expired_detail")}
        backLabel={t("retro_back_home")}
      />
    );
  }

  // --- Fetch session metadata + 3 most recent ENDED encounters (parallel) ---
  const [sessionResult, encountersResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, owner_id")
      .eq("id", tokenRow.session_id)
      .single(),
    supabase
      .from("encounters")
      .select("id, name, ended_at")
      .eq("session_id", tokenRow.session_id)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(3),
  ]);

  const session = sessionResult.data;
  if (!session) {
    return (
      <ErrorScreen
        title={t("retro_error_invalid_title")}
        detail={t("retro_error_invalid_detail")}
        backLabel={t("retro_back_home")}
      />
    );
  }

  const endedEncounters = (encountersResult.data ?? []) as EndedEncounter[];

  if (endedEncounters.length === 0) {
    return (
      <ErrorScreen
        title={t("retro_no_encounters_title")}
        detail={t("retro_no_encounters_detail")}
        backLabel={t("retro_back_home")}
      />
    );
  }

  // --- Fetch DM display name + recap short code for latest encounter (best-effort) ---
  const [dmResult, recapResult] = await Promise.all([
    supabase
      .from("users")
      .select("display_name")
      .eq("id", session.owner_id)
      .maybeSingle(),
    supabase
      .from("combat_reports")
      .select("short_code")
      .eq("encounter_id", endedEncounters[0].id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const dmName = dmResult.data?.display_name ?? null;
  const recapShortCode = recapResult.data?.short_code ?? null;

  const pageData: PageData = {
    token,
    sessionName: session.name,
    dmName,
    encounters: endedEncounters,
    recapShortCode,
  };

  return <FeedbackClient data={pageData} />;
}

function ErrorScreen({
  title,
  detail,
  backLabel,
}: {
  title: string;
  detail: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-3">
        <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{detail}</p>
        <a
          href="/try"
          className="inline-block mt-4 text-sm text-gold hover:text-gold/80 underline"
        >
          {backLabel}
        </a>
      </div>
    </div>
  );
}
