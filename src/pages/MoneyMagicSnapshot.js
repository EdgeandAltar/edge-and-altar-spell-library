import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getJournalBySlug,
  getSnapshotQuestions,
  saveSnapshotResponses,
  getUserProgress,
  createUserProgress,
} from "../services/moneyMagicService";
import "./MoneyMagicSnapshot.css";

const MONEY_BEHAVIORS_OPTIONS = [
  "I avoid looking at my bank account",
  "I check my bank account obsessively",
  "I make fear-based money decisions",
  "I overspend when stressed",
  "I undercharge for my work or time",
  "I feel guilty spending money on myself",
  "I say yes to things I can't afford to avoid disappointing people",
  "I compare my finances to others and feel inadequate",
  "I self-sabotage when things start going well financially",
  "I struggle to receive money, gifts, or compliments",
  "I operate from scarcity even when I have enough",
  "I don't believe I deserve financial success",
];

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

function MoneyMagicSnapshot() {
  const navigate = useNavigate();
  const { snapshotType } = useParams();
  const isAfter = snapshotType === "after";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [journalId, setJournalId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // Guard: only "before" and "after" are valid types
      if (snapshotType !== "before" && snapshotType !== "after") {
        navigate("/journal/money-magic", { replace: true });
        return;
      }

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

      const progress = await getUserProgress(session.userId, journalData.id);
      if (!alive) return;

      if (!isAfter) {
        // Before: if progress already exists they've started — go to current day
        if (progress) {
          navigate(`/journal/money-magic/day/${progress.currentDay}`, { replace: true });
          return;
        }
      } else {
        // After: journey must be complete to access this page
        if (!progress || !progress.completedAt) {
          navigate("/journal/money-magic", { replace: true });
          return;
        }
      }

      const qs = await getSnapshotQuestions(journalData.id, snapshotType);
      if (!alive) return;

      setUserId(session.userId);
      setJournalId(journalData.id);
      setQuestions(qs);
      const initial = {};
      qs.forEach((q) => { initial[q.id] = ""; });
      setResponses(initial);
      setLoading(false);
    };

    load();

    return () => { alive = false; };
  }, [navigate, snapshotType, isAfter]);

  const handleChange = (questionId, value) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        response: responses[q.id] ?? "",
      }));

      const saved = await saveSnapshotResponses(userId, journalId, snapshotType, payload);
      if (!saved) {
        setError("We couldn't save your snapshot. Please try again.");
        setSubmitting(false);
        return;
      }

      if (!isAfter) {
        // Before: create progress row and go to Day 1
        let progress = await createUserProgress(userId, journalId);
        if (!progress) {
          progress = await getUserProgress(userId, journalId);
        }
        const startDay = progress?.currentDay ?? 1;
        navigate(`/journal/money-magic/day/${startDay}`, { replace: true });
      } else {
        // After: go to Day 30 which will show Journey Complete with comparison
        navigate("/journal/money-magic/day/30", { replace: true });
      }
    } catch (err) {
      console.error("[MoneyMagicSnapshot] submit failed:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mms-gate">
        <p className="mms-gate-text">Preparing your snapshot…</p>
      </div>
    );
  }

  return (
    <div className="mms-page">
      {/* Header */}
      <div className="mms-header">
        <p className="mms-eyebrow">Edge &amp; Altar · Money Magic Journal</p>
        <div className="mms-badge">{isAfter ? "After" : "Before"}</div>

        {isAfter ? (
          <>
            <h1 className="mms-title">Your Transformation</h1>
            <p className="mms-subtitle">
              30 days ago, you answered these questions. Answer them again now
              and see how far you have come.
            </p>
          </>
        ) : (
          <>
            <h1 className="mms-title">Your Starting Point</h1>
            <p className="mms-subtitle">
              Answer honestly — there are no right responses here. These words are
              for you alone. On Day 30, you'll return to this page and witness your
              own shift.
            </p>
          </>
        )}
      </div>

      {/* Questions */}
      <div className="mms-form">
        {questions.map((q, i) => {
          const isCheckbox = q.questionKey === "money_behaviors";
          const selectedSet = isCheckbox
            ? new Set((responses[q.id] || "").split(",").map((s) => s.trim()).filter(Boolean))
            : null;

          return (
            <div key={q.id} className="mms-question">
              {isCheckbox ? (
                <div className="mms-question-label">
                  <span className="mms-question-number">{i + 1}</span>
                  {q.questionText}
                </div>
              ) : (
                <label className="mms-question-label" htmlFor={`q-${q.id}`}>
                  <span className="mms-question-number">{i + 1}</span>
                  {q.questionText}
                </label>
              )}

              {isCheckbox ? (
                <div className="mms-checklist">
                  {MONEY_BEHAVIORS_OPTIONS.map((option) => {
                    const checked = selectedSet.has(option);
                    return (
                      <label
                        key={option}
                        className={`mms-check-item${checked ? " mms-check-item--checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="mms-check-input"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedSet);
                            if (next.has(option)) next.delete(option);
                            else next.add(option);
                            handleChange(q.id, Array.from(next).join(", "));
                          }}
                        />
                        <span className="mms-check-label">{option}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  id={`q-${q.id}`}
                  className="mms-textarea"
                  value={responses[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  rows={4}
                  placeholder="Write freely…"
                />
              )}
            </div>
          );
        })}

        {error && <p className="mms-error">{error}</p>}

        <div className="mms-submit-row">
          <p className="mms-submit-note">
            🔒 Your responses are private and protected. Only you can see what you write here.
          </p>
          <button
            className="mms-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : isAfter
              ? "See My Transformation →"
              : "Begin Day 1 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoneyMagicSnapshot;
