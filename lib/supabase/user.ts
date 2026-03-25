import { createClient } from "./server";

export async function getUserLanguagePreference(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "pt-BR";

  const { data } = await supabase
    .from("users")
    .select("preferred_language")
    .eq("id", user.id)
    .single();

  return data?.preferred_language || "pt-BR";
}

export async function updateUserLanguagePreference(
  locale: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("users")
    .update({ preferred_language: locale })
    .eq("id", user.id);
}
