"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { DmSyncDot } from "@/components/layout/DmSyncDot";
import { useDmChannelStatus } from "@/lib/realtime/use-dm-channel-status";

interface NavbarWithSyncProps {
  brand: string;
  brandHref: string;
  links?: { href?: string; label: React.ReactNode; children?: { href: string; label: React.ReactNode }[] }[];
  rightSlot?: React.ReactNode;
}

/**
 * Wraps Navbar and automatically shows a sync status dot when the DM
 * is on an active session page (/app/session/[id]).
 */
export function NavbarWithSync(props: NavbarWithSyncProps) {
  const pathname = usePathname();

  // Extract session ID from /app/session/[uuid] pattern
  const sessionMatch = pathname.match(/^\/app\/session\/([0-9a-f-]{36})$/i);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  const status = useDmChannelStatus(sessionId);

  return (
    <Navbar
      {...props}
      syncSlot={sessionId ? <DmSyncDot status={status} /> : undefined}
    />
  );
}
