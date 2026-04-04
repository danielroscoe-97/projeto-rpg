"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

const MILESTONES = [100, 250, 500, 1000, 2000, 3000, 5000];
const STORAGE_KEY = "methodology_last_milestone";

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

    fetch("/api/methodology/stats")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        const current = data?.valid_combats ?? 0;
        const lastSeen = parseInt(
          localStorage.getItem(STORAGE_KEY) ?? "0",
          10
        );

        // Find the highest milestone reached
        const reached = MILESTONES.filter((m) => current >= m);
        const highest = reached.length > 0 ? reached[reached.length - 1] : 0;

        if (highest > lastSeen) {
          localStorage.setItem(STORAGE_KEY, highest.toString());
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
