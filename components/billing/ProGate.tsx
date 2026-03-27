"use client";

import { useFeatureGate } from "@/lib/hooks/use-feature-gate";
import { ProBadge } from "./ProBadge";
import type { FeatureFlagKey } from "@/lib/types/subscription";

interface ProGateProps {
  flagKey: FeatureFlagKey;
  children: React.ReactNode;
  /** Optional: show a custom fallback instead of ProBadge */
  fallback?: React.ReactNode;
}

/**
 * Feature gate wrapper component.
 * If Pro → renders children.
 * If Free → renders ProBadge (content NOT rendered, not just hidden).
 */
export function ProGate({ flagKey, children, fallback }: ProGateProps) {
  const { allowed, loading } = useFeatureGate(flagKey);

  if (loading) {
    return null; // Don't flash badge while loading
  }

  if (!allowed) {
    return fallback ?? <ProBadge flagKey={flagKey} />;
  }

  return <>{children}</>;
}
