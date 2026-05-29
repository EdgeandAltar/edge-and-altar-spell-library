const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

const TOTAL_DAYS = 30;

const getAccessToken = () => {
  try {
    const storageKey = Object.keys(localStorage).find(
      (k) => k.includes("sb-") && k.includes("-auth-token")
    );
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw)?.access_token || null;
  } catch {
    return null;
  }
};

const authHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${getAccessToken()}`,
  "Content-Type": "application/json",
});

// Module-level slug → journal row cache
const _journalCache = {};

// ─── Journal metadata ──────────────────────────────────────────────────────────

export const getJournalBySlug = async (slug) => {
  if (_journalCache[slug]) return _journalCache[slug];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journals?slug=eq.${slug}&select=id,slug,title,description,is_active&limit=1`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getJournalBySlug failed:", res.status);
      return null;
    }
    const data = await res.json();
    if (!data?.[0]) return null;
    _journalCache[slug] = data[0];
    return data[0];
  } catch (err) {
    console.error("[moneyMagicService] getJournalBySlug:", err);
    return null;
  }
};

// ─── Access ────────────────────────────────────────────────────────────────────

export const checkUserAccess = async (userId, journalId) => {
  if (!userId || !journalId) return { hasAccess: false, accessType: null };
  try {
    const [profileRes, accessRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=access_level&limit=1`,
        { headers: authHeaders() }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/user_journal_access?user_id=eq.${userId}&journal_id=eq.${journalId}&select=id,purchase_type&limit=1`,
        { headers: authHeaders() }
      ),
    ]);

    const profileData = profileRes.ok ? await profileRes.json() : [];
    const accessData = accessRes.ok ? await accessRes.json() : [];

    if (profileData?.[0]?.access_level === "premium") {
      return { hasAccess: true, accessType: "premium" };
    }
    if (accessData?.[0]) {
      return { hasAccess: true, accessType: "standalone" };
    }
    return { hasAccess: false, accessType: null };
  } catch (err) {
    console.error("[moneyMagicService] checkUserAccess:", err);
    return { hasAccess: false, accessType: null };
  }
};

// ─── Progress ──────────────────────────────────────────────────────────────────

export const getUserProgress = async (userId, journalId) => {
  if (!userId || !journalId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_progress?user_id=eq.${userId}&journal_id=eq.${journalId}&select=id,current_day,started_at,completed_at&limit=1`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getUserProgress failed:", res.status);
      return null;
    }
    const data = await res.json();
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      currentDay: row.current_day,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  } catch (err) {
    console.error("[moneyMagicService] getUserProgress:", err);
    return null;
  }
};

export const createUserProgress = async (userId, journalId) => {
  if (!userId || !journalId) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_journal_progress`, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        journal_id: journalId,
        current_day: 1,
        started_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.warn("[moneyMagicService] createUserProgress failed:", res.status);
      return null;
    }
    const data = await res.json();
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      currentDay: row.current_day,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  } catch (err) {
    console.error("[moneyMagicService] createUserProgress:", err);
    return null;
  }
};

// Atomically advances current_day only when it equals fromDay, preventing double-increments.
export const advanceDay = async (userId, journalId, fromDay) => {
  if (!userId || !journalId || !fromDay) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_progress?user_id=eq.${userId}&journal_id=eq.${journalId}&current_day=eq.${fromDay}`,
      {
        method: "PATCH",
        headers: { ...authHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({ current_day: fromDay + 1 }),
      }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] advanceDay failed:", res.status);
      return null;
    }
    const data = await res.json();
    return data?.[0]?.current_day ?? null;
  } catch (err) {
    console.error("[moneyMagicService] advanceDay:", err);
    return null;
  }
};

const completeJourney = async (userId, journalId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_progress?user_id=eq.${userId}&journal_id=eq.${journalId}`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ completed_at: new Date().toISOString() }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
};

// ─── Front matter ──────────────────────────────────────────────────────────────

export const getFrontMatter = async (journalId) => {
  if (!journalId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_front_matter?journal_id=eq.${journalId}&select=id,display_order,title,content&order=display_order.asc`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getFrontMatter failed:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => ({
      id: row.id,
      order: row.display_order,
      sectionTitle: row.title,
      content: row.content,
    }));
  } catch (err) {
    console.error("[moneyMagicService] getFrontMatter:", err);
    return [];
  }
};

// ─── Snapshot ──────────────────────────────────────────────────────────────────

export const getSnapshotQuestions = async (journalId, snapshotType = "before") => {
  if (!journalId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_snapshot_questions?journal_id=eq.${journalId}&snapshot_type=eq.${snapshotType}&select=id,display_order,question_text,question_key&order=display_order.asc`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getSnapshotQuestions failed:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => ({
      id: row.id,
      order: row.display_order,
      questionText: row.question_text,
      questionKey: row.question_key ?? null,
    }));
  } catch (err) {
    console.error("[moneyMagicService] getSnapshotQuestions:", err);
    return [];
  }
};

// responses: [{ questionId, response }] — saved as a single JSONB row
export const saveSnapshotResponses = async (userId, journalId, snapshotType, responses) => {
  if (!userId || !journalId || !snapshotType || !responses?.length) return false;
  try {
    // Build one JSONB object: { [questionId]: answer, ... }
    const responsesObj = {};
    responses.forEach(({ questionId, response }) => {
      responsesObj[questionId] = response;
    });

    // Check for an existing row so we PATCH rather than duplicate
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_snapshots?user_id=eq.${userId}&journal_id=eq.${journalId}&snapshot_type=eq.${snapshotType}&select=id&limit=1`,
      { headers: authHeaders() }
    );
    const existing = checkRes.ok ? await checkRes.json() : [];

    if (existing?.length > 0) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_journal_snapshots?id=eq.${existing[0].id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ responses: responsesObj }),
        }
      );
      if (!res.ok) {
        console.warn("[moneyMagicService] saveSnapshotResponses PATCH failed:", res.status, await res.text());
        return false;
      }
    } else {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_journal_snapshots`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          user_id: userId,
          journal_id: journalId,
          snapshot_type: snapshotType,
          responses: responsesObj,
        }),
      });
      if (!res.ok) {
        console.warn("[moneyMagicService] saveSnapshotResponses POST failed:", res.status, await res.text());
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("[moneyMagicService] saveSnapshotResponses:", err);
    return false;
  }
};

// Returns [{ questionText, response }] ordered by display_order, or null if snapshot never submitted
export const getSnapshotWithAnswers = async (userId, journalId, snapshotType) => {
  if (!userId || !journalId || !snapshotType) return null;
  try {
    const [questionsRes, snapshotRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/journal_snapshot_questions?journal_id=eq.${journalId}&snapshot_type=eq.${snapshotType}&select=id,display_order,question_text,question_key&order=display_order.asc`,
        { headers: authHeaders() }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/user_journal_snapshots?user_id=eq.${userId}&journal_id=eq.${journalId}&snapshot_type=eq.${snapshotType}&select=responses&limit=1`,
        { headers: authHeaders() }
      ),
    ]);

    const questions = questionsRes.ok ? await questionsRes.json() : [];
    const snapshots = snapshotRes.ok ? await snapshotRes.json() : [];

    // null means snapshot was never submitted
    if (!snapshots || snapshots.length === 0) return null;

    const responseMap = snapshots[0].responses || {};

    return (questions || []).map((q) => ({
      questionText: q.question_text,
      questionKey: q.question_key ?? null,
      response: responseMap[q.id] ?? "",
    }));
  } catch (err) {
    console.error("[moneyMagicService] getSnapshotWithAnswers:", err);
    return null;
  }
};

// ─── Day content ───────────────────────────────────────────────────────────────

export const getDayContent = async (journalId, dayNumber) => {
  if (!journalId || !dayNumber) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_days?journal_id=eq.${journalId}&day_number=eq.${dayNumber}&select=id,day_number,title,focus_text,journal_prompt,creative_activity,mini_ritual,psychology_note&limit=1`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getDayContent failed:", res.status);
      return null;
    }
    const data = await res.json();
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      dayNumber: row.day_number,
      title: row.title,
      focusText: row.focus_text,
      journalPrompt: row.journal_prompt,
      creativeActivity: row.creative_activity,
      miniRitual: row.mini_ritual,
      psychologyNote: row.psychology_note,
    };
  } catch (err) {
    console.error("[moneyMagicService] getDayContent:", err);
    return null;
  }
};

// ─── User entries ──────────────────────────────────────────────────────────────

export const getDayEntry = async (userId, journalId, dayNumber) => {
  if (!userId || !journalId || !dayNumber) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_entries?user_id=eq.${userId}&journal_id=eq.${journalId}&day_number=eq.${dayNumber}&select=id,journal_response,creative_response,completed_at&limit=1`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getDayEntry failed:", res.status);
      return null;
    }
    const data = await res.json();
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      journalResponse: row.journal_response ?? "",
      creativeResponse: row.creative_response ?? "",
      completedAt: row.completed_at,
    };
  } catch (err) {
    console.error("[moneyMagicService] getDayEntry:", err);
    return null;
  }
};

// Upserts the entry. Requires a unique constraint on (user_id, journal_id, day_number).
export const saveDayEntry = async (
  userId,
  journalId,
  dayNumber,
  { journalResponse, creativeResponse }
) => {
  if (!userId || !journalId || !dayNumber) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_journal_entries?on_conflict=user_id,journal_id,day_number`, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: userId,
        journal_id: journalId,
        day_number: dayNumber,
        journal_response: journalResponse ?? "",
        creative_response: creativeResponse ?? "",
      }),
    });
    if (!res.ok) {
      console.warn("[moneyMagicService] saveDayEntry failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[moneyMagicService] saveDayEntry:", err);
    return false;
  }
};

// Saves entry and advances progress. For day 30, marks the journey complete instead.
export const markDayComplete = async (
  userId,
  journalId,
  dayNumber,
  { journalResponse, creativeResponse }
) => {
  const saved = await saveDayEntry(userId, journalId, dayNumber, {
    journalResponse,
    creativeResponse,
  });
  if (!saved) return false;

  if (dayNumber >= TOTAL_DAYS) {
    return await completeJourney(userId, journalId);
  }

  const newDay = await advanceDay(userId, journalId, dayNumber);
  return newDay !== null;
};

// ─── Reference sections ────────────────────────────────────────────────────────

export const getReferenceSections = async (journalId) => {
  if (!journalId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_reference_sections?journal_id=eq.${journalId}&select=id,title,content&order=id.asc`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      const body = await res.text();
      console.warn("[moneyMagicService] getReferenceSections failed:", res.status, body);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
    }));
  } catch (err) {
    console.error("[moneyMagicService] getReferenceSections:", err);
    return [];
  }
};

// ─── Micro-wins ────────────────────────────────────────────────────────────────

export const getUserWins = async (userId, journalId) => {
  if (!userId || !journalId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_journal_wins?user_id=eq.${userId}&journal_id=eq.${journalId}&select=id,win_text,created_at&order=created_at.desc`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getUserWins failed:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => ({
      id: row.id,
      winText: row.win_text,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("[moneyMagicService] getUserWins:", err);
    return [];
  }
};

// ─── Day meta (for home page grid) ────────────────────────────────────────────

export const getAllDaysMeta = async (journalId) => {
  if (!journalId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/journal_days?journal_id=eq.${journalId}&select=id,day_number,title&order=day_number.asc`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.warn("[moneyMagicService] getAllDaysMeta failed:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => ({
      id: row.id,
      dayNumber: row.day_number,
      title: row.title,
    }));
  } catch (err) {
    console.error("[moneyMagicService] getAllDaysMeta:", err);
    return [];
  }
};

export const addMicroWin = async (userId, journalId, dayNumber, winText) => {
  if (!userId || !journalId || !winText?.trim()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_journal_wins`, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        journal_id: journalId,
        day_number: dayNumber,
        win_text: winText.trim(),
        created_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[moneyMagicService] addMicroWin failed:", res.status, body);
      return null;
    }
    const data = await res.json();
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      winText: row.win_text,
      createdAt: row.created_at,
    };
  } catch (err) {
    console.error("[moneyMagicService] addMicroWin:", err);
    return null;
  }
};
