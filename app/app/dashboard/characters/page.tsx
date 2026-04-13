export const dynamic = "force-dynamic";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MyCharactersPage } from "@/components/dashboard/MyCharactersPage";

export default async function CharactersPage() {
  const [user, supabase] = await Promise.all([getAuthUser(), createClient()]);
  if (!user) redirect("/auth/login");

  const { data: characters } = await supabase
    .from("player_characters")
    .select("*, campaigns(id, name)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <MyCharactersPage initialCharacters={characters ?? []} />;
}
