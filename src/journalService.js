const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

/**
 * Get access token from localStorage
 */
const getAccessToken = () => {
  try {
    const storageKey = Object.keys(localStorage).find(
      (k) => k.includes("sb-") && k.includes("-auth-token")
    );
    if (!storageKey) return null;

    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch (err) {
    console.warn("[journalService] Failed to get token:", err);
    return null;
  }
};

/**
 * Shape returned to match your old Firestore entries:
 * {
 *   id, spellId, spellTitle, date, rating, notes, tags
 * }
 */
const mapRowToEntry = (row) => ({
  id: row.id,
  spellId: row.spell_id,
  spellTitle: row.spell_title,
  date: row.entry_date,
  rating: row.rating ?? null,
  notes: row.notes ?? "",
  tags: Array.isArray(row.tags) ? row.tags : [],
});

// Get user's journal entries
export const getUserJournal = async (userId) => {
  if (!userId) return [];

  const token = getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_entries?user_id=eq.${userId}&select=id,spell_id,spell_title,entry_date,rating,notes,tags&order=entry_date.desc`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn("[journalService] getUserJournal failed:", response.status);
      return [];
    }

    const data = await response.json();
    return (data || []).map(mapRowToEntry);
  } catch (err) {
    console.error("[journalService] getUserJournal failed:", err);
    return [];
  }
};

// Add journal entry
export const addJournalEntry = async (userId, entry) => {
  if (!userId) return null;

  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = {
      user_id: userId,
      spell_id: entry.spellId,
      spell_title: entry.spellTitle || "Untitled Spell",
      rating: entry.rating ?? null,
      notes: entry.notes ?? "",
      tags: Array.isArray(entry.tags) ? entry.tags : [],
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_entries`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      console.warn("[journalService] addJournalEntry failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data?.[0] ? mapRowToEntry(data[0]) : null;
  } catch (err) {
    console.error("[journalService] addJournalEntry failed:", err);
    return null;
  }
};

// Update journal entry
export const updateJournalEntry = async (userId, entryId, updates) => {
  if (!userId || !entryId) return false;

  const token = getAccessToken();
  if (!token) return false;

  try {
    const patch = {};
    if ("spellId" in updates) patch.spell_id = updates.spellId;
    if ("spellTitle" in updates) patch.spell_title = updates.spellTitle;
    if ("date" in updates) patch.entry_date = updates.date;
    if ("rating" in updates) patch.rating = updates.rating ?? null;
    if ("notes" in updates) patch.notes = updates.notes ?? "";
    if ("tags" in updates) patch.tags = Array.isArray(updates.tags) ? updates.tags : [];

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_entries?id=eq.${entryId}&user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!response.ok) {
      console.warn("[journalService] updateJournalEntry failed:", response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[journalService] updateJournalEntry failed:", err);
    return false;
  }
};

// Delete journal entry
export const deleteJournalEntry = async (userId, entryId) => {
  if (!userId || !entryId) return false;

  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_entries?id=eq.${entryId}&user_id=eq.${userId}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn("[journalService] deleteJournalEntry failed:", response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[journalService] deleteJournalEntry failed:", err);
    return false;
  }
};

// Get entries for specific spell (client-side helper)
export const getEntriesForSpell = (entries, spellId) => {
  return (entries || []).filter((entry) => String(entry.spellId) === String(spellId));
};

// Get recent entries (client-side helper)
export const getRecentEntries = (entries, count = 10) => {
  return [...(entries || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
};