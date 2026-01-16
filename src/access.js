import { supabase } from "./supabaseClient";

export async function getAccessLevel() {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) return "free";

  const { data, error } = await supabase
    .from("profiles")
    .select("access_level")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data?.access_level ?? "free";
}
