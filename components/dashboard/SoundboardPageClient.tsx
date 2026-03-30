"use client";

import dynamic from "next/dynamic";

const DmSoundboard = dynamic(
  () => import("@/components/audio/DmSoundboard").then((m) => m.DmSoundboard),
  { ssr: false }
);

interface SoundboardPageClientProps {
  title: string;
}

export function SoundboardPageClient({ title }: SoundboardPageClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <DmSoundboard />
    </div>
  );
}
