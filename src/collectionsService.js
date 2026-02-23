import { supabase } from "./supabaseClient";

const MAX_COLLECTIONS = 15;

// Get all collections for a user, with spell counts
export const getUserCollections = async (userId) => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_spells(count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[collectionsService] getUserCollections error:", error);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      spellCount: c.collection_spells?.[0]?.count ?? 0,
    }));
  } catch (err) {
    console.error("[collectionsService] getUserCollections failed:", err);
    return [];
  }
};

// Get a single collection by ID
export const getCollectionById = async (collectionId, userId) => {
  if (!collectionId || !userId) return null;

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_spells(count)")
      .eq("id", collectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[collectionsService] getCollectionById error:", error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      spellCount: data.collection_spells?.[0]?.count ?? 0,
    };
  } catch (err) {
    console.error("[collectionsService] getCollectionById failed:", err);
    return null;
  }
};

// Get all spells in a collection (with full spell data)
export const getCollectionSpells = async (collectionId) => {
  if (!collectionId) return [];

  try {
    // First get the spell IDs from the junction table
    const { data: junctionData, error: junctionError } = await supabase
      .from("collection_spells")
      .select("spell_id, added_at")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false });

    if (junctionError) {
      console.warn("[collectionsService] getCollectionSpells junction error:", junctionError);
      return [];
    }

    if (!junctionData || junctionData.length === 0) return [];

    const spellIds = junctionData.map((j) => j.spell_id);

    // Then fetch the spells
    const { data: spellsData, error: spellsError } = await supabase
      .from("spells")
      .select("id, title, when_to_use, category, time_required, skill_level, is_premium, image_url, is_custom")
      .in("id", spellIds);

    if (spellsError) {
      console.warn("[collectionsService] getCollectionSpells spells error:", spellsError);
      return [];
    }

    // Map and maintain junction table order
    const spellMap = new Map((spellsData || []).map((s) => [s.id, s]));

    return junctionData
      .map((j) => {
        const s = spellMap.get(j.spell_id);
        if (!s) return null;
        return {
          id: s.id,
          title: s.title,
          whenToUse: s.when_to_use,
          category: s.category,
          timeRequired: s.time_required,
          skillLevel: s.skill_level,
          isPremium: Boolean(s.is_premium),
          imageUrl: s.image_url,
          isCustom: Boolean(s.is_custom),
          addedAt: j.added_at,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error("[collectionsService] getCollectionSpells failed:", err);
    return [];
  }
};

// Get collection count for a user
export const getUserCollectionCount = async (userId) => {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from("collections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.warn("[collectionsService] getUserCollectionCount error:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("[collectionsService] getUserCollectionCount failed:", err);
    return 0;
  }
};

// Create a new collection
export const createCollection = async (userId, name, description = "") => {
  if (!userId || !name) return null;

  try {
    // Check limit
    const count = await getUserCollectionCount(userId);
    if (count >= MAX_COLLECTIONS) {
      return { error: `You can create up to ${MAX_COLLECTIONS} collections.` };
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.warn("[collectionsService] createCollection error:", error);
      return { error: "Failed to create collection." };
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      spellCount: 0,
    };
  } catch (err) {
    console.error("[collectionsService] createCollection failed:", err);
    return { error: "Failed to create collection." };
  }
};

// Update a collection
export const updateCollection = async (collectionId, userId, updates) => {
  if (!collectionId || !userId) return false;

  try {
    const patch = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.description !== undefined) patch.description = updates.description?.trim() || null;

    const { error } = await supabase
      .from("collections")
      .update(patch)
      .eq("id", collectionId)
      .eq("user_id", userId);

    if (error) {
      console.warn("[collectionsService] updateCollection error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[collectionsService] updateCollection failed:", err);
    return false;
  }
};

// Delete a collection
export const deleteCollection = async (collectionId, userId) => {
  if (!collectionId || !userId) return false;

  try {
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", userId);

    if (error) {
      console.warn("[collectionsService] deleteCollection error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[collectionsService] deleteCollection failed:", err);
    return false;
  }
};

// Add a spell to a collection
export const addSpellToCollection = async (collectionId, spellId) => {
  if (!collectionId || !spellId) return false;

  try {
    const { error } = await supabase
      .from("collection_spells")
      .insert({
        collection_id: collectionId,
        spell_id: String(spellId),
      });

    if (error) {
      // Already exists
      if (error.code === "23505") return true;
      console.warn("[collectionsService] addSpellToCollection error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[collectionsService] addSpellToCollection failed:", err);
    return false;
  }
};

// Remove a spell from a collection
export const removeSpellFromCollection = async (collectionId, spellId) => {
  if (!collectionId || !spellId) return false;

  try {
    const { error } = await supabase
      .from("collection_spells")
      .delete()
      .eq("collection_id", collectionId)
      .eq("spell_id", String(spellId));

    if (error) {
      console.warn("[collectionsService] removeSpellFromCollection error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[collectionsService] removeSpellFromCollection failed:", err);
    return false;
  }
};

// Get which of a user's collections contain a specific spell
export const getCollectionsForSpell = async (userId, spellId) => {
  if (!userId || !spellId) return [];

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("id, name, collection_spells!inner(spell_id)")
      .eq("user_id", userId)
      .eq("collection_spells.spell_id", String(spellId));

    if (error) {
      console.warn("[collectionsService] getCollectionsForSpell error:", error);
      return [];
    }

    return (data || []).map((c) => c.id);
  } catch (err) {
    console.error("[collectionsService] getCollectionsForSpell failed:", err);
    return [];
  }
};
