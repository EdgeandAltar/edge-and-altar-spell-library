import { supabase } from "../supabaseClient";
import { getAccessLevel } from "../access";

const CUSTOM_SPELL_LIMIT_FREE = 5;

/**
 * Get the count of custom spells for a specific user
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} The count of custom spells
 */
export async function getCustomSpellCount(userId) {
  const { count, error } = await supabase
    .from("spells")
    .select("*", { count: "exact", head: true })
    .eq("created_by_user_id", userId)
    .eq("is_custom", true);

  if (error) {
    console.error("Error counting custom spells:", error);
    throw error;
  }

  return count || 0;
}

/**
 * Check if a user can create a new custom spell
 * @param {string} userId - The user's ID
 * @returns {Promise<{allowed: boolean, limit: number, current: number}>}
 */
export async function canCreateCustomSpell(userId) {
  try {
    const [count, accessLevel] = await Promise.all([
      getCustomSpellCount(userId),
      getAccessLevel(),
    ]);

    if (accessLevel === "premium") {
      return { allowed: true, limit: Infinity, current: count };
    }

    return {
      allowed: count < CUSTOM_SPELL_LIMIT_FREE,
      limit: CUSTOM_SPELL_LIMIT_FREE,
      current: count,
    };
  } catch (error) {
    console.error("Error checking custom spell creation eligibility:", error);
    throw error;
  }
}

/**
 * Get all custom spells for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of custom spells
 */
export async function getUserCustomSpells(userId) {
  const { data, error } = await supabase
    .from("spells")
    .select("*")
    .eq("created_by_user_id", userId)
    .eq("is_custom", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user custom spells:", error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new custom spell
 * @param {string} userId - The user's ID
 * @param {object} spellData - The spell data (camelCase fields)
 * @returns {Promise<object>} The created spell
 */
export async function createCustomSpell(userId, spellData) {
  // Check if user can create a custom spell
  const canCreate = await canCreateCustomSpell(userId);

  if (!canCreate.allowed) {
    throw new Error(
      `You've reached the limit of ${canCreate.limit} custom spells. Upgrade to Premium for unlimited custom spells!`
    );
  }

  // Convert camelCase to snake_case and add custom spell fields
  const payload = {
    title: spellData.title,
    category: spellData.category,
    time_required: spellData.timeRequired,
    skill_level: spellData.skillLevel,
    when_to_use: spellData.whenToUse,
    ingredients: spellData.ingredients,
    instructions: spellData.instructions,
    why_this_works: spellData.whyThisWorks || null,
    spoken_intention: spellData.spokenIntention || null,
    tips: spellData.tips || null,
    vibe: spellData.vibe || null,
    supplies_needed: spellData.suppliesNeeded || null,
    image_url: spellData.imageUrl || null,
    seasonal_tags: spellData.seasonalTags || [],
    tags: spellData.tags || [],
    slug: spellData.slug || null,
    created_by_user_id: userId,
    is_custom: true,
    is_premium: false, // Custom spells are never premium-gated
  };

  const { data, error } = await supabase
    .from("spells")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating custom spell:", error);
    throw error;
  }

  return data;
}

/**
 * Update a custom spell
 * @param {string} spellId - The spell's ID
 * @param {string} userId - The user's ID (for verification)
 * @param {object} updates - The updates to apply (camelCase fields)
 * @returns {Promise<object>} The updated spell
 */
export async function updateCustomSpell(spellId, userId, updates) {
  // Convert camelCase to snake_case
  const payload = {
    title: updates.title,
    category: updates.category,
    time_required: updates.timeRequired,
    skill_level: updates.skillLevel,
    when_to_use: updates.whenToUse,
    ingredients: updates.ingredients,
    instructions: updates.instructions,
    why_this_works: updates.whyThisWorks || null,
    spoken_intention: updates.spokenIntention || null,
    tips: updates.tips || null,
    vibe: updates.vibe || null,
    supplies_needed: updates.suppliesNeeded || null,
    image_url: updates.imageUrl || null,
    seasonal_tags: updates.seasonalTags || [],
    tags: updates.tags || [],
    slug: updates.slug || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("spells")
    .update(payload)
    .eq("id", spellId)
    .eq("created_by_user_id", userId)
    .eq("is_custom", true)
    .select()
    .single();

  if (error) {
    console.error("Error updating custom spell:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Spell not found or you don't have permission to edit it");
  }

  return data;
}

/**
 * Delete a custom spell
 * @param {string} spellId - The spell's ID
 * @param {string} userId - The user's ID (for verification)
 * @returns {Promise<boolean>} True if successful
 */
export async function deleteCustomSpell(spellId, userId) {
  const { error } = await supabase
    .from("spells")
    .delete()
    .eq("id", spellId)
    .eq("created_by_user_id", userId)
    .eq("is_custom", true);

  if (error) {
    console.error("Error deleting custom spell:", error);
    throw error;
  }

  return true;
}
