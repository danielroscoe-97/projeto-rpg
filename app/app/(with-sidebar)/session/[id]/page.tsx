import { redirect } from "next/navigation";

interface LegacySessionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Legacy route — redirects to new /app/combat/[id] structure.
 * Kept for compatibility with shared links from before the Linguagem Ubíqua migration.
 */
export default async function LegacySessionPage({ params }: LegacySessionPageProps) {
  const { id } = await params;
  redirect(`/app/combat/${id}`);
}
