// JO-05: Role selection is now integrated into OnboardingWizard as the first step.
// This page is deprecated — redirect to the main onboarding flow.
export const dynamic = "force-dynamic"; // P2-04: prevent static prerender of redirect

import { redirect } from "next/navigation";

export default function RoleSelectionPage() {
  redirect("/app/onboarding");
}
