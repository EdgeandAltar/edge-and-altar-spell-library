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
 * Shape returned with enhanced tracking fields:
 * {
 *   id, spellId, spellTitle, date, rating, notes, tags,
 *   moodBefore, moodAfter, intention, wouldDoAgain, isPrivate, created_at, updated_at
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
  moodBefore: row.mood_before ?? null,
  moodAfter: row.mood_after ?? null,
  intention: row.intention ?? null,
  wouldDoAgain: row.would_do_again ?? null,
  isPrivate: row.is_private ?? false,
  created_at: row.created_at ?? null,
  updated_at: row.updated_at ?? null,
});

// Get user's journal entries
export const getUserJournal = async (userId) => {
  if (!userId) return [];

  const token = getAccessToken();
  if (!token) return [];

  try {
    // TODO: After running migration, add these fields to select: mood_before,mood_after,intention,would_do_again,is_private,created_at,updated_at
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
    // Base payload with always-supported fields
    const payload = {
      user_id: userId,
      spell_id: entry.spellId,
      spell_title: entry.spellTitle || "Untitled Spell",
      entry_date: entry.date || new Date().toISOString().split('T')[0],
      rating: entry.rating ?? null,
      notes: entry.notes ?? "",
      tags: Array.isArray(entry.tags) ? entry.tags : [],
    };

    // TODO: Uncomment these after running the database migration (20260214_enhance_journal_tracking.sql)
    // if (entry.moodBefore !== undefined) payload.mood_before = entry.moodBefore ?? null;
    // if (entry.moodAfter !== undefined) payload.mood_after = entry.moodAfter ?? null;
    // if (entry.intention !== undefined) payload.intention = entry.intention ?? null;
    // if (entry.wouldDoAgain !== undefined) payload.would_do_again = entry.wouldDoAgain ?? null;
    // if (entry.isPrivate !== undefined) payload.is_private = entry.isPrivate ?? false;

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

    // TODO: Uncomment these after running the database migration (20260214_enhance_journal_tracking.sql)
    // if ("moodBefore" in updates) patch.mood_before = updates.moodBefore ?? null;
    // if ("moodAfter" in updates) patch.mood_after = updates.moodAfter ?? null;
    // if ("intention" in updates) patch.intention = updates.intention ?? null;
    // if ("wouldDoAgain" in updates) patch.would_do_again = updates.wouldDoAgain ?? null;
    // if ("isPrivate" in updates) patch.is_private = updates.isPrivate ?? false;

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

/**
 * Group journal entries by date for timeline view
 * @param {Array} entries - Journal entries sorted by date DESC
 * @returns {Object} - { "2026-02-13": [...entries], "2026-02-12": [...] }
 */
export const groupEntriesByDate = (entries) => {
  const grouped = {};

  (entries || []).forEach(entry => {
    const dateKey = new Date(entry.date).toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });

  return grouped;
};

/**
 * Format date for timeline display
 * @param {string} dateString - ISO date string
 * @returns {string} - "Today", "Yesterday", or "Monday, Feb 10"
 */
export const formatTimelineDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to midnight for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });
  }
};

/**
 * Get moon phase emoji for a specific date
 * @param {string} dateString - ISO date string
 * @returns {string} - Moon phase emoji
 */
export const getMoonPhaseForDate = (dateString) => {
  try {
    // Dynamically import to avoid circular dependencies
    const { getCurrentMoonPhase } = require('./moonPhaseService');
    const moonData = getCurrentMoonPhase(new Date(dateString));
    return moonData?.phaseEmoji || "🌙";
  } catch (err) {
    console.warn("[journalService] getMoonPhaseForDate error:", err);
    return "🌙";
  }
};

/**
 * Calculate spell statistics for a specific spell
 * @param {Array} entries - All entries for a specific spell
 * @returns {Object} - Statistics object
 */
export const calculateSpellStats = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      timesPerformed: 0,
      avgRating: 0,
      highestRating: 0,
      lowestRating: 0,
      wouldDoAgainPercent: null,
      avgMoodChange: 0,
      trend: "insufficient_data"
    };
  }

  const validRatings = entries.filter(e => e.rating).map(e => e.rating);
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0;

  // Trend calculation (last 3 vs first 3)
  let trend = "consistent";
  if (validRatings.length >= 4) {
    const recent = validRatings.slice(0, 3);
    const earlier = validRatings.slice(-3);
    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, r) => sum + r, 0) / earlier.length;

    if (recentAvg > earlierAvg + 0.5) trend = "improving";
    else if (recentAvg < earlierAvg - 0.5) trend = "declining";
  }

  // Would do again stats
  const wouldDoAgainEntries = entries.filter(e => e.wouldDoAgain !== null);
  const wouldDoAgainYes = wouldDoAgainEntries.filter(e => e.wouldDoAgain === true).length;
  const wouldDoAgainPercent = wouldDoAgainEntries.length > 0
    ? Math.round((wouldDoAgainYes / wouldDoAgainEntries.length) * 100)
    : null;

  // Mood change calculation
  const moodChanges = [];
  entries.forEach(entry => {
    if (entry.moodBefore && entry.moodAfter) {
      const before = parseInt(entry.moodBefore) || 0;
      const after = parseInt(entry.moodAfter) || 0;
      moodChanges.push(after - before);
    }
  });

  const avgMoodChange = moodChanges.length > 0
    ? moodChanges.reduce((sum, change) => sum + change, 0) / moodChanges.length
    : 0;

  return {
    timesPerformed: entries.length,
    avgRating: parseFloat(avgRating.toFixed(1)),
    highestRating: validRatings.length > 0 ? Math.max(...validRatings) : 0,
    lowestRating: validRatings.length > 0 ? Math.min(...validRatings) : 0,
    wouldDoAgainPercent,
    avgMoodChange: parseFloat(avgMoodChange.toFixed(1)),
    trend
  };
};

/**
 * Get overall journal statistics
 * @param {Array} entries - All journal entries
 * @returns {Object} - Overall statistics
 */
export const getOverallStats = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      totalSpellsPerformed: 0,
      uniqueSpells: 0,
      avgEffectiveness: 0,
      totalWithReflections: 0,
      totalWithMoodTracking: 0,
      mostPerformedSpell: null
    };
  }

  const validRatings = entries.filter(e => e.rating).map(e => e.rating);
  const avgEffectiveness = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0;

  const uniqueSpellIds = new Set(entries.map(e => e.spellId));

  // Count spell performances
  const spellCounts = {};
  entries.forEach(entry => {
    spellCounts[entry.spellId] = (spellCounts[entry.spellId] || 0) + 1;
  });

  const mostPerformedSpellId = Object.entries(spellCounts).reduce((max, [id, count]) =>
    count > (max[1] || 0) ? [id, count] : max, ["", 0]
  );

  const mostPerformedEntry = entries.find(e => String(e.spellId) === mostPerformedSpellId[0]);

  return {
    totalSpellsPerformed: entries.length,
    uniqueSpells: uniqueSpellIds.size,
    avgEffectiveness: parseFloat(avgEffectiveness.toFixed(1)),
    totalWithReflections: entries.filter(e => e.notes && e.notes.trim() !== "").length,
    totalWithMoodTracking: entries.filter(e => e.moodBefore || e.moodAfter).length,
    mostPerformedSpell: mostPerformedEntry ? {
      id: mostPerformedEntry.spellId,
      title: mostPerformedEntry.spellTitle,
      count: mostPerformedSpellId[1]
    } : null
  };
};

/**
 * Filter entries by various criteria
 * @param {Array} entries - All entries
 * @param {Object} filters - Filter options
 * @returns {Array} - Filtered entries
 */
export const filterEntries = (entries, filters = {}) => {
  let filtered = [...entries];

  // Date range filter
  if (filters.startDate) {
    filtered = filtered.filter(e => new Date(e.date) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    filtered = filtered.filter(e => new Date(e.date) <= new Date(filters.endDate));
  }

  // Rating filter
  if (filters.minRating) {
    filtered = filtered.filter(e => e.rating && e.rating >= filters.minRating);
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(e =>
      e.tags && filters.tags.some(tag => e.tags.includes(tag))
    );
  }

  // Spell category filter (if entries include spell data)
  if (filters.spellId) {
    filtered = filtered.filter(e => String(e.spellId) === String(filters.spellId));
  }

  // Has notes filter
  if (filters.hasNotes) {
    filtered = filtered.filter(e => e.notes && e.notes.trim() !== "");
  }

  // Has mood tracking filter
  if (filters.hasMoodTracking) {
    filtered = filtered.filter(e => e.moodBefore || e.moodAfter);
  }

  // Would do again filter
  if (filters.wouldDoAgain !== undefined) {
    filtered = filtered.filter(e => e.wouldDoAgain === filters.wouldDoAgain);
  }

  return filtered;
};