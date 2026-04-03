export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MyCharactersPage } from "@/components/dashboard/MyCharactersPage";

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: characters } = await supabase
    .from("player_characters")
    .select("*, campaigns(id, name)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <MyCharactersPage initialCharacters={characters ?? []} />;
}
