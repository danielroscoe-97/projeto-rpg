import { redirect } from "next/navigation";

/**
 * Legacy route — redirects to new /app/combat/new structure.
 * Kept for compatibility with shared links from before the Linguagem Ubíqua migration.
 */
export default function LegacyNewSessionPage() {
  redirect("/app/combat/new");
}
