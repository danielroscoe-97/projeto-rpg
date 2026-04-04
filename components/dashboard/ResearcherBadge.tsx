"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Sparkles } from "lucide-react";

interface ResearcherBadgeProps {
  userId: string;
  title: string;
  subtitle: string;
  linkText: string;
}

interface ContributionData {
  total_combats: number;
  rated_combats: number;
  is_researcher: boolean;
}

const SEEN_KEY = "researcher_badge_seen";

export function ResearcherBadge({
  userId,
  title,
  subtitle,
  linkText,
}: ResearcherBadgeProps) {
  const [data, setData] = useState<ContributionData | null>(null);
  const [animateReveal, setAnimateReveal] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch("/api/methodology/contribution")
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.json();
      })
      .then((d: ContributionData) => {
        if (cancelled) return;
        setData(d);
        if (d.is_researcher && !localStorage.getItem(SEEN_KEY)) {
          setAnimateReveal(true);
          localStorage.setItem(SEEN_KEY, "1");
        }
      })
      .catch(() => {
        /* fail silently */
      });

    return () => { cancelled = true; };
  }, [userId]);

  if (!data?.is_researcher) return null;

  return (
    <Link
      href="/methodology"
      className={`block rounded-xl border p-4 transition-all duration-500 hover:border-gold/30 ${
        animateReveal
          ? "animate-fade-in border-gold/25 bg-gradient-to-br from-gold/[0.04] to-transparent shadow-[0_0_15px_rgba(212,168,83,0.1)]"
          : "border-gold/15 bg-gold/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
          {animateReveal ? (
            <Sparkles className="w-5 h-5 text-gold animate-pulse" />
          ) : (
            <FlaskConical className="w-5 h-5 text-gold" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gold">{title}</p>
          <p className="text-xs text-foreground/50 mt-0.5">
            {subtitle.replace("{count}", data.rated_combats.toString())}
          </p>
        </div>
      </div>
      <p className="text-xs text-gold/50 mt-2 hover:text-gold/70 transition-colors">
        {linkText}
      </p>
    </Link>
  );
}
