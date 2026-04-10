"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutDashboard } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { DmSyncDot } from "@/components/layout/DmSyncDot";
import { useDmChannelStatus } from "@/lib/realtime/use-dm-channel-status";

interface NavbarWithSyncProps {
  brand: string;
  brandHref: string;
  links?: { href?: string; label: React.ReactNode; children?: { href: string; label: React.ReactNode }[]; tourId?: string }[];
  rightSlot?: React.ReactNode;
}

/**
 * Wraps Navbar and automatically shows a sync status dot when the DM
 * is on an active session page (/app/session/[id]).
 * When inside a campaign, hides Compêndio and shows campaign breadcrumb.
 */
export function NavbarWithSync(props: NavbarWithSyncProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Extract session ID from /app/session/[uuid] pattern
  const sessionMatch = pathname.match(/^\/app\/session\/([0-9a-f-]{36})$/i);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  const status = useDmChannelStatus(sessionId);

  // Inside campaign: hide Compêndio, show Dashboard button instead
  const isCampaignRoute = pathname.startsWith("/app/campaigns/");

  // G-08/G-26: Onboarding wizard — minimal navbar (no links, no extras)
  const isOnboarding = pathname === "/app/onboarding";

  const effectiveLinks = isOnboarding
    ? undefined
    : isCampaignRoute
      ? [
          {
            href: "/app/dashboard",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                {t("dashboard")}
              </span>
            ),
          },
        ]
      : props.links;

  return (
    <Navbar
      {...props}
      links={effectiveLinks}
      rightSlot={isOnboarding ? undefined : props.rightSlot}
      minimal={isOnboarding}
      syncSlot={sessionId ? <DmSyncDot status={status} /> : undefined}
    />
  );
}
