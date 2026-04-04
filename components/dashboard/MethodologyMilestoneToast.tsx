"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

const MILESTONES = [100, 250, 500, 1000, 2000, 3000, 5000];
const STORAGE_KEY = "methodology_last_milestone";
const CHECKED_KEY = "methodology_last_checked";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface MethodologyMilestoneToastProps {
  toastMessage: string;
  linkText: string;
}

export function MethodologyMilestoneToast({
  toastMessage,
  linkText,
}: MethodologyMilestoneToastProps) {
  useEffect(() => {
    let cancelled = false;

    // P8: Debounce — skip fetch if checked recently
    const lastChecked = parseInt(localStorage.getItem(CHECKED_KEY) ?? "0", 10) || 0;
    if (Date.now() - lastChecked < CHECK_INTERVAL_MS) return;

    fetch("/api/methodology/stats")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        localStorage.setItem(CHECKED_KEY, Date.now().toString());

        const current = data?.valid_combats ?? 0;
        // P9: Guard against NaN from corrupted localStorage
        const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) || 0;

        // Find the highest milestone reached
        const reached = MILESTONES.filter((m) => current >= m);
        const highest = reached.length > 0 ? reached[reached.length - 1] : 0;

        if (highest > lastSeen) {
          const message = toastMessage.replace(
            "{count}",
            highest.toLocaleString()
          );
          toast(message, {
            icon: <FlaskConical className="w-4 h-4 text-gold" />,
            description: linkText,
            action: {
              label: "→",
              onClick: () => {
                window.location.href = "/methodology";
              },
            },
            duration: 8000,
          });
          // P6: Write localStorage AFTER toast fires successfully
          localStorage.setItem(STORAGE_KEY, highest.toString());
        }
      })
      .catch(() => {
        /* fail silently */
      });

    return () => {
      cancelled = true;
    };
  }, [toastMessage, linkText]);

  return null;
}
