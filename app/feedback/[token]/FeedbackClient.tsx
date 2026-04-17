"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DifficultyRatingStrip } from "@/components/combat/DifficultyRatingStrip";
import { trackEvent } from "@/lib/analytics/track";

const NOTES_MAX = 280;
const FINGERPRINT_STORAGE_KEY = "pocketdm:feedback_voter_id";

/** RFC4122 v4 UUID check — defence-in-depth against malformed localStorage. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Return a stable voter fingerprint UUID for this browser. Generated on
 * first visit and persisted in localStorage. Used as a discriminator in
 * `encounter_votes` so multiple players sharing one /feedback/[token] link
 * each get their own vote row.
 */
function getOrCreateVoterFingerprint(): string {
  if (typeof window === "undefined") {
    // SSR — should never be called here, but be defensive.
    return crypto.randomUUID();
  }
  try {
    const existing = window.localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (existing && UUID_RE.test(existing)) {
      return existing;
    }
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(FINGERPRINT_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage blocked (private mode / quota) — fall back to an
    // ephemeral UUID. Votes still work; reloads create a new row.
    return crypto.randomUUID();
  }
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

type Phase = "voting" | "submitting" | "done" | "error";

export function FeedbackClient({ data }: { data: PageData }) {
  const t = useTranslations("feedback");
  const tCombat = useTranslations("combat");

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    data.encounters[0]?.id ?? "",
  );
  const [vote, setVote] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("voting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voterFingerprint, setVoterFingerprint] = useState<string | null>(null);

  // Read/generate the voter fingerprint once, client-side only.
  useEffect(() => {
    setVoterFingerprint(getOrCreateVoterFingerprint());
  }, []);

  // Analytics: page viewed (fire once on mount)
  useEffect(() => {
    trackEvent("feedback:page_viewed", {
      has_multiple_encounters: data.encounters.length > 1,
    });
  }, [data.encounters.length]);

  const selectedEncounter = useMemo(
    () => data.encounters.find((e) => e.id === selectedEncounterId) ?? null,
    [data.encounters, selectedEncounterId],
  );

  const formatEndedAt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const handleSubmit = async () => {
    if (!vote || !selectedEncounterId) return;
    const fingerprint = voterFingerprint ?? getOrCreateVoterFingerprint();

    setPhase("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.token,
          encounter_id: selectedEncounterId,
          vote,
          voter_fingerprint: fingerprint,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "unknown" }));
        if (res.status === 429) {
          setErrorMsg(t("retro_error_rate_limited"));
        } else if (body?.error === "invalid_token") {
          setErrorMsg(t("retro_error_invalid_detail"));
        } else {
          setErrorMsg(t("retro_error_submit"));
        }
        setPhase("error");
        return;
      }

      trackEvent("feedback:vote_submitted", {
        vote,
        has_notes: notes.trim().length > 0,
      });
      setPhase("done");
    } catch (err) {
      console.warn("[feedback] submit error", err);
      setErrorMsg(t("retro_error_submit"));
      setPhase("error");
    }
  };

  // ---- Thanks screen ------------------------------------------------------
  if (phase === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center space-y-5 bg-surface-overlay border border-white/10 rounded-xl p-6"
        >
          <CheckCircle2 className="size-12 text-green-400 mx-auto" />
          <h1 className="text-foreground text-xl font-semibold">
            {t("retro_thanks_title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("retro_thanks_subtitle")}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {data.recapShortCode && (
              <a
                href={`/r/${data.recapShortCode}`}
                className="w-full min-h-[44px] inline-flex items-center justify-center rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors px-4"
              >
                {t("retro_cta_view_recap")}
              </a>
            )}
            <a
              href="/try"
              className="w-full min-h-[44px] inline-flex items-center justify-center rounded-lg border border-white/10 text-muted-foreground text-sm font-medium hover:text-foreground hover:border-white/20 transition-colors px-4"
            >
              {t("retro_cta_play_again")}
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Voting screen ------------------------------------------------------
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full bg-surface-overlay border border-white/10 rounded-xl p-6 space-y-5"
      >
        <div className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-wide text-gold/80 font-medium">
            PocketDM
          </p>
          <h1 className="text-foreground text-lg font-semibold">
            {t("retro_page_title")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {data.dmName
              ? t("retro_encounter_info_with_dm", {
                  name: data.sessionName,
                  dm: data.dmName,
                })
              : t("retro_encounter_info", { name: data.sessionName })}
          </p>
        </div>

        {/* Encounter selector (only if multiple) */}
        {data.encounters.length > 1 && (
          <div className="space-y-1.5">
            <label
              htmlFor="feedback-encounter-select"
              className="text-xs text-muted-foreground block"
            >
              {t("retro_choose_encounter")}
            </label>
            <select
              id="feedback-encounter-select"
              value={selectedEncounterId}
              onChange={(e) => setSelectedEncounterId(e.target.value)}
              className="w-full min-h-[44px] rounded-lg bg-background border border-white/10 text-foreground text-sm px-3 focus:outline-none focus:border-gold/40"
            >
              {data.encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {(enc.name ?? t("retro_encounter_untitled")) +
                    " — " +
                    formatEndedAt(enc.ended_at)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedEncounter && (
          <p className="text-xs text-muted-foreground text-center">
            {t("retro_encounter_ended_at", {
              when: formatEndedAt(selectedEncounter.ended_at),
            })}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm text-foreground text-center">
            {tCombat("poll_title")}
          </p>
          <DifficultyRatingStrip
            initialValue={vote ?? null}
            onSelect={(v) => setVote(v)}
          />
        </div>

        {/* Optional notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="feedback-notes"
            className="text-xs text-muted-foreground block"
          >
            {t("retro_notes_label")}
          </label>
          <textarea
            id="feedback-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
            maxLength={NOTES_MAX}
            rows={3}
            placeholder={t("retro_notes_placeholder")}
            className="w-full rounded-lg bg-background border border-white/10 text-foreground text-sm px-3 py-2 resize-none focus:outline-none focus:border-gold/40"
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {notes.length}/{NOTES_MAX}
          </p>
        </div>

        {errorMsg && phase === "error" && (
          <p className="text-xs text-red-400 text-center">{errorMsg}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!vote || phase === "submitting"}
          data-testid="feedback-submit-btn"
          className="w-full min-h-[48px] inline-flex items-center justify-center rounded-lg bg-gold text-black font-semibold text-sm hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-4"
        >
          {phase === "submitting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            t("retro_submit_cta")
          )}
        </button>
      </motion.div>
    </div>
  );
}
