export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1 text-sm">
            Manage your encounters and campaigns.
          </p>
        </div>
        <Link
          href="/app/session/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#e94560] text-white font-medium text-sm hover:bg-[#c73652] transition-colors"
          data-testid="new-encounter-btn"
        >
          + New Encounter
        </Link>
      </div>

      <div className="text-white/40 text-sm text-center mt-20">
        No encounters yet.{" "}
        <Link
          href="/app/session/new"
          className="text-[#e94560] hover:underline"
        >
          Start your first encounter
        </Link>{" "}
        to get going.
      </div>
    </div>
  );
}
