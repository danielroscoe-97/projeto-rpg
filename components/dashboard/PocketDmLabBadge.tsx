"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";

interface PocketDmLabBadgeProps {
  tooltip: string;
}

export function PocketDmLabBadge({ tooltip }: PocketDmLabBadgeProps) {
  return (
    <Link
      href="/methodology"
      className="group relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 hover:bg-gold/20 transition-colors duration-300 overflow-hidden"
      title={tooltip}
    >
      <span className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
      <FlaskConical className="relative z-10 w-4 h-4 text-gold group-hover:text-gold-light transition-colors" />
      <span className="sr-only">{tooltip}</span>
    </Link>
  );
}
