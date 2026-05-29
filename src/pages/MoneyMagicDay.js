import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  getJournalBySlug,
  getUserProgress,
  getDayContent,
  getDayEntry,
  saveDayEntry,
  markDayComplete,
  getReferenceSections,
  getSnapshotWithAnswers,
} from "../services/moneyMagicService";
import MicroWinModal from "../components/MicroWinModal";
import "./MoneyMagicDay.css";

const TOTAL_DAYS = 30;

const getSessionFromStorage = () => {
  try {
    const storageKey = Object.keys(localStorage).find(
      (k) => k.includes("sb-") && k.includes("-auth-token")
    );
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { userId: parsed?.user?.id };
  } catch {
    return null;
  }
};


function JourneyComplete({ onReturn, onCompleteAfterSnapshot, beforeSnapshot, afterSnapshot }) {
  const hasComparison = beforeSnapshot && afterSnapshot &&
    beforeSnapshot.length > 0 && afterSnapshot.length > 0;
  const needsAfterSnapshot = afterSnapshot === null;

  return (
    <div className="mmd-jc-page">
      <div className={`mmd-jc-inner${hasComparison ? " mmd-jc-inner--wide" : ""}`}>
        <p className="mmd-jc-eyebrow">Edge &amp; Altar · Money Magic Journal</p>
        <div className="mmd-jc-ornament">✦</div>
        <h1 className="mmd-jc-title">You did it.</h1>
        <p className="mmd-jc-subtitle">30 days. One honest practice.</p>
        <p className="mmd-jc-body">
          You showed up — through the resistant days, the revelatory ones, and
          everything in between. Your relationship with money has shifted. You
          may not see all of it yet, but something has changed.
        </p>

        {needsAfterSnapshot && (
          <>
            <p className="mmd-jc-body">
              One last step: answer the same questions you answered on Day 1
              and witness your own transformation.
            </p>
            <button
              className="mmd-jc-btn"
              type="button"
              onClick={onCompleteAfterSnapshot}
              style={{ marginBottom: 16 }}
            >
              Complete Your After Snapshot →
            </button>
          </>
        )}

        {hasComparison && (
          <div className="mmd-jc-compare">
            <p className="mmd-jc-compare-heading">Look how far you have come.</p>
            <div className="mmd-jc-compare-grid">
              <div className="mmd-jc-compare-col">
                <p className="mmd-jc-compare-col-label">Day 1 — Before</p>
                {beforeSnapshot.map((item, i) => {
                  const behaviors = item.questionKey === "money_behaviors" && item.response
                    ? item.response.split(",").map((s) => s.trim()).filter(Boolean)
                    : null;
                  return (
                    <div key={i} className="mmd-jc-compare-question">
                      <p className="mmd-jc-compare-q">{item.questionText}</p>
                      {behaviors ? (
                        <ul className="mmd-jc-compare-behaviors">
                          {behaviors.map((b, j) => <li key={j}>{b}</li>)}
                        </ul>
                      ) : (
                        <p className="mmd-jc-compare-a">{item.response || "—"}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mmd-jc-compare-col">
                <p className="mmd-jc-compare-col-label">Day 30 — After</p>
                {afterSnapshot.map((item, i) => {
                  const behaviors = item.questionKey === "money_behaviors" && item.response
                    ? item.response.split(",").map((s) => s.trim()).filter(Boolean)
                    : null;
                  return (
                    <div key={i} className="mmd-jc-compare-question">
                      <p className="mmd-jc-compare-q">{item.questionText}</p>
                      {behaviors ? (
                        <ul className="mmd-jc-compare-behaviors">
                          {behaviors.map((b, j) => <li key={j}>{b}</li>)}
                        </ul>
                      ) : (
                        <p className="mmd-jc-compare-a">{item.response || "—"}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <button className="mmd-jc-btn" type="button" onClick={onReturn}>
          Return to My Library
        </button>
      </div>
    </div>
  );
}

function MoneyMagicDay() {
  const { dayNumber: dayParam } = useParams();
  const navigate = useNavigate();
  const dayNumber = parseInt(dayParam, 10);

  // Core data
  const [loading, setLoading] = useState(true);
  const [dayContent, setDayContent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [referenceSections, setReferenceSections] = useState([]);
  const [journalId, setJournalId] = useState(null);
  const [userId, setUserId] = useState(null);

  // Entry text
  const [journalResponse, setJournalResponse] = useState("");
  const [creativeResponse, setCreativeResponse] = useState("");

  // Save indicator: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState("idle");

  // Completion flow
  const [completing, setCompleting] = useState(false);
  const [dayCompleted, setDayCompleted] = useState(false); // brief success flash
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [beforeSnapshot, setBeforeSnapshot] = useState(undefined);
  const [afterSnapshot, setAfterSnapshot] = useState(undefined);

  // Sidebar
  const [showMicroWin, setShowMicroWin] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const savedResponsesRef = useRef({ journal: "", creative: "" });
  const saveTimerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Re-runs whenever dayNumber changes (navigating between days)
  useEffect(() => {
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
      navigate("/journal/money-magic", { replace: true });
      return;
    }

    // Reset ephemeral state for new day
    setLoading(true);
    setDayCompleted(false);
    setJourneyComplete(false);
    setCompleting(false);
    setSaveStatus("idle");
    setExpandedSection(null);
    setJournalResponse("");
    setCreativeResponse("");
    savedResponsesRef.current = { journal: "", creative: "" };

    let alive = true;

    const load = async () => {
      const session = getSessionFromStorage();
      if (!session?.userId) {
        navigate("/login", { replace: true });
        return;
      }

      const journalData = await getJournalBySlug("money-magic");
      if (!alive) return;
      if (!journalData) {
        navigate("/journal/money-magic", { replace: true });
        return;
      }

      const [userProgress, content, entry, refs] = await Promise.all([
        getUserProgress(session.userId, journalData.id),
        getDayContent(journalData.id, dayNumber),
        getDayEntry(session.userId, journalData.id, dayNumber),
        getReferenceSections(journalData.id),
      ]);
      if (!alive) return;

      // No progress row means they haven't started
      if (!userProgress) {
        navigate("/journal/money-magic/intro", { replace: true });
        return;
      }

      // Sequential lock — future days redirect to current
      if (dayNumber > userProgress.currentDay) {
        navigate(`/journal/money-magic/day/${userProgress.currentDay}`, {
          replace: true,
        });
        return;
      }

      if (!content) {
        navigate(`/journal/money-magic/day/${userProgress.currentDay}`, {
          replace: true,
        });
        return;
      }

      const jr = entry?.journalResponse ?? "";
      const cr = entry?.creativeResponse ?? "";

      setUserId(session.userId);
      setJournalId(journalData.id);
      setProgress(userProgress);
      setDayContent(content);
      setReferenceSections(refs);
      setJournalResponse(jr);
      setCreativeResponse(cr);
      savedResponsesRef.current = { journal: jr, creative: cr };

      // Returning to day 30 after completion → fetch snapshots then show journey complete
      if (dayNumber === TOTAL_DAYS && userProgress.completedAt) {
        const [before, after] = await Promise.all([
          getSnapshotWithAnswers(session.userId, journalData.id, "before"),
          getSnapshotWithAnswers(session.userId, journalData.id, "after"),
        ]);
        if (!alive) return;
        setBeforeSnapshot(before);
        setAfterSnapshot(after);
        setJourneyComplete(true);
      }

      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, [dayNumber, navigate]);

  // Called onBlur from either textarea
  const handleAutoSave = async (jr, cr) => {
    if (!userId || !journalId) return;
    if (
      jr === savedResponsesRef.current.journal &&
      cr === savedResponsesRef.current.creative
    )
      return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");

    const ok = await saveDayEntry(userId, journalId, dayNumber, {
      journalResponse: jr,
      creativeResponse: cr,
    });

    if (ok) {
      savedResponsesRef.current = { journal: jr, creative: cr };
      setSaveStatus("saved");
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // "Mark Day Complete" — current day only
  const handleComplete = async () => {
    setCompleting(true);
    const ok = await markDayComplete(userId, journalId, dayNumber, {
      journalResponse,
      creativeResponse,
    });
    if (!ok) {
      setCompleting(false);
      return;
    }
    savedResponsesRef.current = { journal: journalResponse, creative: creativeResponse };

    if (dayNumber >= TOTAL_DAYS) {
      navigate("/journal/money-magic/snapshot/after");
    } else {
      setCompleting(false);
      setDayCompleted(true);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        navigate("/journal/money-magic");
      }, 1400);
    }
  };

  // "Update Responses" — past days only
  const handleUpdatePastDay = async () => {
    if (!userId || !journalId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    const ok = await saveDayEntry(userId, journalId, dayNumber, {
      journalResponse,
      creativeResponse,
    });
    if (ok) {
      savedResponsesRef.current = { journal: journalResponse, creative: creativeResponse };
      setSaveStatus("saved");
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mmd-gate">
        <p className="mmd-gate-text">Opening your journal…</p>
      </div>
    );
  }

  if (journeyComplete) {
    return (
      <JourneyComplete
        onReturn={() => navigate("/")}
        onCompleteAfterSnapshot={() => navigate("/journal/money-magic/snapshot/after")}
        beforeSnapshot={beforeSnapshot}
        afterSnapshot={afterSnapshot}
      />
    );
  }

  const isPastDay = dayNumber < (progress?.currentDay ?? 1);
  const isCurrentDay = dayNumber === (progress?.currentDay ?? 1);

  const processField = (text) =>
    (text || "").replace(/\n—/g, "\n\n—").replace(/ — /g, "\n\n— ");

  const processedFocusText      = processField(dayContent.focusText);
  const processedJournalPrompt  = processField(dayContent.journalPrompt);
  const processedCreativeActivity = processField(dayContent.creativeActivity);
  const processedMiniRitual     = processField(dayContent.miniRitual);
  const processedPsychologyNote = processField(dayContent.psychologyNote);

  return (
    <div className="mmd-page">
      <div className="mmd-layout">

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <main className="mmd-main">

          {/* Breadcrumb */}
          <button
            className="mmd-breadcrumb"
            type="button"
            onClick={() => navigate("/journal/money-magic")}
          >
            ← Your Journey
          </button>

          {/* Day header */}
          <header className="mmd-header">
            <div className="mmd-header-meta">
              <span className="mmd-day-label">Day {dayNumber}</span>
              <span className="mmd-day-count">{dayNumber} / {TOTAL_DAYS}</span>
            </div>
            <h1 className="mmd-day-title">{dayContent.title}</h1>
            {dayContent.focusText && (
              <div className="mmd-focus-text">
                <ReactMarkdown>{processedFocusText}</ReactMarkdown>
              </div>
            )}
          </header>

          {/* Autosave indicator */}
          {saveStatus !== "idle" && (
            <p className={`mmd-save-badge mmd-save-badge--${saveStatus}`}>
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "✓ Saved"}
              {saveStatus === "error" && "Could not save — check your connection"}
            </p>
          )}

          {/* ── Journal Prompt ─────────────────────────────────────────── */}
          <section className="mmd-card">
            <div className="mmd-card-header">
              <span className="mmd-section-icon" aria-hidden="true">📝</span>
              <h2 className="mmd-section-heading">Journal Prompt</h2>
            </div>
            <div className="mmd-prompt-body mmd-md">
              <ReactMarkdown>{processedJournalPrompt}</ReactMarkdown>
            </div>
            <textarea
              className="mmd-textarea"
              value={journalResponse}
              onChange={(e) => setJournalResponse(e.target.value)}
              onBlur={() => handleAutoSave(journalResponse, creativeResponse)}
              placeholder="Write freely — this is your space…"
              rows={9}
              aria-label="Journal response"
            />
          </section>

          {/* ── Creative Activity ──────────────────────────────────────── */}
          <section className="mmd-card">
            <div className="mmd-card-header">
              <span className="mmd-section-icon" aria-hidden="true">🎨</span>
              <h2 className="mmd-section-heading">Creative Activity</h2>
            </div>
            <div className="mmd-prompt-body mmd-md">
              <ReactMarkdown>{processedCreativeActivity}</ReactMarkdown>
            </div>
            <textarea
              className="mmd-textarea"
              value={creativeResponse}
              onChange={(e) => setCreativeResponse(e.target.value)}
              onBlur={() => handleAutoSave(journalResponse, creativeResponse)}
              placeholder="Note what came up, what you made, what you noticed…"
              rows={5}
              aria-label="Creative activity response"
            />
          </section>

          {/* ── Mini-Ritual ────────────────────────────────────────────── */}
          <section className="mmd-card mmd-card--ritual">
            <div className="mmd-card-header">
              <span className="mmd-section-icon" aria-hidden="true">✨</span>
              <h2 className="mmd-section-heading">Mini-Ritual</h2>
            </div>
            <div className="mmd-ritual-body mmd-md">
              <ReactMarkdown>{processedMiniRitual}</ReactMarkdown>
            </div>
          </section>

          {/* ── Psychology Note ────────────────────────────────────────── */}
          {dayContent.psychologyNote && (
            <aside className="mmd-psychology">
              <span className="mmd-psychology-icon" aria-hidden="true">🧠</span>
              <div className="mmd-psychology-body mmd-md">
                <ReactMarkdown>{processedPsychologyNote}</ReactMarkdown>
              </div>
            </aside>
          )}

          {/* ── Action row ─────────────────────────────────────────────── */}
          <div className="mmd-actions">
            {isCurrentDay && !dayCompleted && (
              <button
                className="mmd-complete-btn"
                type="button"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing
                  ? "Saving…"
                  : dayNumber === TOTAL_DAYS
                  ? "Complete the Journey ✦"
                  : "Mark Day Complete →"}
              </button>
            )}

            {isCurrentDay && dayCompleted && (
              <div className="mmd-day-done">
                <span className="mmd-day-done-mark">✦</span>
                Day {dayNumber} complete — see you tomorrow.
              </div>
            )}

            {isPastDay && (
              <button
                className="mmd-update-btn"
                type="button"
                onClick={handleUpdatePastDay}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? "Saving…" : "Update Responses"}
              </button>
            )}
          </div>

        </main>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="mmd-sidebar">

          <button
            className="mmd-sidebar-btn mmd-sidebar-btn--win"
            type="button"
            onClick={() => setShowMicroWin(true)}
          >
            <span>✦</span>
            Add a Micro-Win
          </button>

          {referenceSections.map((section) => (
            <div key={section.id} className="mmd-ref-block">
              <button
                className={`mmd-sidebar-btn ${
                  expandedSection === section.id ? "mmd-sidebar-btn--open" : ""
                }`}
                type="button"
                onClick={() =>
                  setExpandedSection((prev) =>
                    prev === section.id ? null : section.id
                  )
                }
              >
                <span>📖</span>
                {section.title}
                <span className="mmd-chevron">
                  {expandedSection === section.id ? "▲" : "▼"}
                </span>
              </button>

              {expandedSection === section.id && (
                <div className="mmd-ref-content mmd-md">
                  <ReactMarkdown>{section.content || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

        </aside>
      </div>

      {showMicroWin && (
        <MicroWinModal
          userId={userId}
          journalId={journalId}
          dayNumber={dayNumber}
          onClose={() => setShowMicroWin(false)}
        />
      )}
    </div>
  );
}

export default MoneyMagicDay;
