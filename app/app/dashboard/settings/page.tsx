import { redirect } from "next/navigation";

/**
 * Dashboard settings sub-route redirects to the main settings page.
 * This keeps the sidebar navigation consistent while reusing the existing
 * settings implementation at /app/settings.
 */
export default function DashboardSettingsPage() {
  redirect("/app/settings");
}
