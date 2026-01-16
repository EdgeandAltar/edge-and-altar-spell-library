import { supabase } from "./supabaseClient";

// Get user's favorites (returns array of spell_id strings)
export const getUserFavorites = async (userId) => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("spell_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("[favoritesService] getUserFavorites error:", error);
      return [];
    }

    return (data || []).map((row) => String(row.spell_id));
  } catch (err) {
    console.error("[favoritesService] getUserFavorites failed:", err);
    return [];
  }
};

// Add spell to favorites
export const addToFavorites = async (userId, spellId) => {
  if (!userId || !spellId) return false;

  try {
    // Insert will fail if it already exists (primary key).
    // That’s OK — treat it as success.
    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      spell_id: String(spellId),
    });

    if (error) {
      // If unique violation, it’s already favorited → success
      // PostgREST often returns code 23505 for unique violation.
      if (error.code === "23505") return true;

      console.warn("[favoritesService] addToFavorites error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[favoritesService] addToFavorites failed:", err);
    return false;
  }
};

// Remove spell from favorites
export const removeFromFavorites = async (userId, spellId) => {
  if (!userId || !spellId) return false;

  try {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("spell_id", String(spellId));

    if (error) {
      console.warn("[favoritesService] removeFromFavorites error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[favoritesService] removeFromFavorites failed:", err);
    return false;
  }
};

// Check if spell is favorited
export const isSpellFavorited = (favorites, spellId) => {
  return (favorites || []).includes(String(spellId));
};
