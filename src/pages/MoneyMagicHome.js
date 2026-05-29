import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  getAllDaysMeta,
  getReferenceSections,
  getUserWins,
  getFrontMatter,
  getSnapshotWithAnswers,
} from "../services/moneyMagicService";
import MicroWinModal from "../components/MicroWinModal";
import "./MoneyMagicHome.css";

const TOTAL_DAYS = 30;

const TRANSFORMATION_PAIRS = [
  { label: "Monthly Income",           beforeKey: "current_income",       afterKey: "after_monthly_income"  },
  { label: "Savings",                  beforeKey: "current_savings",      afterKey: "after_savings"         },
  { label: "Debt",                     beforeKey: "current_debt",         afterKey: "after_debt"            },
  { label: "Money Anxiety (1–10)",     beforeKey: "money_anxiety_score",  afterKey: "after_money_anxiety"   },
  { label: "Feeling Worthy (1–10)",    beforeKey: "worthy_score",         afterKey: "after_worthy_score"    },
  { label: "Feeling in Control (1–10)",beforeKey: "control_score",        afterKey: "after_control_score"   },
  { label: "Core Money Belief",        beforeKey: "dominant_belief",      afterKey: "after_dominant_belief" },
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

function MoneyMagicHome({ journal, progress }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [daysMeta, setDaysMeta] = useState([]);
  const [referenceSections, setReferenceSections] = useState([]);
  const [wins, setWins] = useState([]);
  const [expandedRef, setExpandedRef] = useState(null);
  const [showMicroWin, setShowMicroWin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [frontMatter, setFrontMatter] = useState([]);
  const [beforeSnapshot, setBeforeSnapshot] = useState(null);
  const [afterSnapshot, setAfterSnapshot] = useState(null);
  const [expandedFrontMatter, setExpandedFrontMatter] = useState(false);
  const [expandedBeforeSnapshot, setExpandedBeforeSnapshot] = useState(false);
  const [expandedAfterSnapshot, setExpandedAfterSnapshot] = useState(false);
  const [expandedTransformation, setExpandedTransformation] = useState(true);

  useEffect(() => {
    if (!journal?.id) return;
    let alive = true;

    const load = async () => {
      const session = getSessionFromStorage();
      if (!session?.userId) return;

      const [meta, refs, userWins, fm, snapBefore, snapAfter] = await Promise.all([
        getAllDaysMeta(journal.id),
        getReferenceSections(journal.id),
        getUserWins(session.userId, journal.id),
        getFrontMatter(journal.id),
        getSnapshotWithAnswers(session.userId, journal.id, "before"),
        getSnapshotWithAnswers(session.userId, journal.id, "after"),
      ]);

      if (!alive) return;

      setUserId(session.userId);
      setDaysMeta(meta);
      setReferenceSections(refs);
      setWins(userWins);
      setFrontMatter(fm || []);
      setBeforeSnapshot(snapBefore);
      setAfterSnapshot(snapAfter);
      setLoading(false);
    };

    load();
    return () => { alive = false; };
  }, [journal]);

  if (loading) {
    return (
      <div className="mmh-gate">
        <p className="mmh-gate-text">Opening your journal…</p>
      </div>
    );
  }

  const isComplete = !!progress.completedAt;
  const completedCount = isComplete ? TOTAL_DAYS : Math.max(0, progress.currentDay - 1);
  const pct = Math.round((completedCount / TOTAL_DAYS) * 100);

  const getDayStatus = (n) => {
    if (isComplete || n < progress.currentDay) return "completed";
    if (n === progress.currentDay) return "current";
    return "locked";
  };

  return (
    <div className="mmh-page">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mmh-header">
        <p className="mmh-eyebrow">Edge &amp; Altar · Money Magic Journal</p>
        <h1 className="mmh-title">
          {isComplete ? "Journey Complete" : "Your Journey"}
        </h1>

        <div className="mmh-progress-row">
          <div className="mmh-progress-track">
            <div className="mmh-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="mmh-progress-label">
            {isComplete
              ? `All ${TOTAL_DAYS} days complete ✦`
              : `${completedCount} of ${TOTAL_DAYS} days`}
          </span>
        </div>

        {!isComplete && (
          <button
            className="mmh-continue-btn"
            type="button"
            onClick={() => navigate(`/journal/money-magic/day/${progress.currentDay}`)}
          >
            Continue Day {progress.currentDay} →
          </button>
        )}
      </div>

      {/* ── Day grid ────────────────────────────────────────────────────── */}
      <div className="mmh-grid">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((n) => {
          const meta = daysMeta.find((d) => d.dayNumber === n);
          const status = getDayStatus(n);

          if (status === "current") {
            return (
              <button
                key={n}
                className="mmh-day mmh-day--current"
                type="button"
                onClick={() => navigate(`/journal/money-magic/day/${n}`)}
              >
                <span className="mmh-day-num">Day {n}</span>
                {meta?.title && <span className="mmh-day-title">{meta.title}</span>}
                <span className="mmh-day-cta">Today →</span>
              </button>
            );
          }

          if (status === "completed") {
            return (
              <button
                key={n}
                className="mmh-day mmh-day--done"
                type="button"
                onClick={() => navigate(`/journal/money-magic/day/${n}`)}
              >
                <span className="mmh-day-check" aria-hidden="true">✦</span>
                <span className="mmh-day-num">Day {n}</span>
                {meta?.title && <span className="mmh-day-title">{meta.title}</span>}
              </button>
            );
          }

          return (
            <div key={n} className="mmh-day mmh-day--locked" aria-hidden="true">
              <span className="mmh-day-num">Day {n}</span>
            </div>
          );
        })}
      </div>

      {/* ── Micro-wins ───────────────────────────────────────────────────── */}
      <div className="mmh-wins-section">
        <div className="mmh-wins-header">
          <h2 className="mmh-section-heading">Micro-Wins</h2>
          <button
            className="mmh-add-win-btn"
            type="button"
            onClick={() => setShowMicroWin(true)}
          >
            ✦ Add a Win
          </button>
        </div>

        {wins.length > 0 ? (
          <ul className="mmh-wins-list">
            {wins.map((w) => (
              <li key={w.id} className="mmh-win-item">
                <span className="mmh-win-mark" aria-hidden="true">✦</span>
                {w.winText}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mmh-wins-empty">
            Track the small shifts — a cleared bill, a calmer conversation about money, a new belief that settled in.
          </p>
        )}
      </div>

      {/* ── About This Journal (front matter) ──────────────────────────── */}
      {frontMatter.length > 0 && (
        <div className="mmh-front-matter">
          <div className="mmh-ref-block">
            <button
              className={`mmh-ref-btn ${expandedFrontMatter ? "mmh-ref-btn--open" : ""}`}
              type="button"
              onClick={() => setExpandedFrontMatter((prev) => !prev)}
            >
              <span aria-hidden="true">✦</span>
              About This Journal
              <span className="mmh-chevron" aria-hidden="true">
                {expandedFrontMatter ? "▲" : "▼"}
              </span>
            </button>
            {expandedFrontMatter && (
              <div className="mmh-ref-content mmh-md">
                {frontMatter.map((section) => (
                  <div key={section.id} className="mmh-fm-section">
                    <h3 className="mmh-fm-section-title">{section.sectionTitle}</h3>
                    <ReactMarkdown>{section.content || ""}</ReactMarkdown>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Before Snapshot ─────────────────────────────────────────────── */}
      {beforeSnapshot && beforeSnapshot.length > 0 && (
        <div className="mmh-snapshot-section">
          <div className="mmh-ref-block">
            <button
              className={`mmh-ref-btn ${expandedBeforeSnapshot ? "mmh-ref-btn--open" : ""}`}
              type="button"
              onClick={() => setExpandedBeforeSnapshot((prev) => !prev)}
            >
              <span aria-hidden="true">🌙</span>
              Before Snapshot — Day 1
              <span className="mmh-chevron" aria-hidden="true">
                {expandedBeforeSnapshot ? "▲" : "▼"}
              </span>
            </button>
            {expandedBeforeSnapshot && (
              <div className="mmh-ref-content">
                <div className="mmh-snapshot-qa">
                  {beforeSnapshot.map((item, i) => {
                    const isBehaviors = item.questionKey === "money_behaviors";
                    const behaviorItems = isBehaviors && item.response
                      ? item.response.split(",").map((s) => s.trim()).filter(Boolean)
                      : null;
                    return (
                      <div key={i} className="mmh-snapshot-item">
                        <p className="mmh-snapshot-qnum">Question {i + 1}</p>
                        <p className="mmh-snapshot-q">{item.questionText}</p>
                        {behaviorItems && behaviorItems.length > 0 ? (
                          <ul className="mmh-snapshot-behaviors">
                            {behaviorItems.map((b, j) => <li key={j}>{b}</li>)}
                          </ul>
                        ) : (
                          <p className="mmh-snapshot-a">
                            {item.response || <span className="mmh-snapshot-empty">No response recorded.</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── After Snapshot ──────────────────────────────────────────────── */}
      {afterSnapshot && afterSnapshot.length > 0 && (
        <div className="mmh-snapshot-section">
          <div className="mmh-ref-block">
            <button
              className={`mmh-ref-btn ${expandedAfterSnapshot ? "mmh-ref-btn--open" : ""}`}
              type="button"
              onClick={() => setExpandedAfterSnapshot((prev) => !prev)}
            >
              <span aria-hidden="true">✦</span>
              After Snapshot — Day 30
              <span className="mmh-chevron" aria-hidden="true">
                {expandedAfterSnapshot ? "▲" : "▼"}
              </span>
            </button>
            {expandedAfterSnapshot && (
              <div className="mmh-ref-content">
                <div className="mmh-snapshot-qa">
                  {afterSnapshot.map((item, i) => {
                    const isBehaviors = item.questionKey === "money_behaviors";
                    const behaviorItems = isBehaviors && item.response
                      ? item.response.split(",").map((s) => s.trim()).filter(Boolean)
                      : null;
                    return (
                      <div key={i} className="mmh-snapshot-item">
                        <p className="mmh-snapshot-qnum">Question {i + 1}</p>
                        <p className="mmh-snapshot-q">{item.questionText}</p>
                        {behaviorItems && behaviorItems.length > 0 ? (
                          <ul className="mmh-snapshot-behaviors">
                            {behaviorItems.map((b, j) => <li key={j}>{b}</li>)}
                          </ul>
                        ) : (
                          <p className="mmh-snapshot-a">
                            {item.response || <span className="mmh-snapshot-empty">No response recorded.</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Your Transformation ─────────────────────────────────────────── */}
      {beforeSnapshot && afterSnapshot && (
        <div className="mmh-transformation">
          <button
            className={`mmh-transformation-toggle${expandedTransformation ? " mmh-transformation-toggle--open" : ""}`}
            type="button"
            onClick={() => setExpandedTransformation((prev) => !prev)}
          >
            <span aria-hidden="true">✦</span>
            Your Transformation
            <span className="mmh-chevron mmh-chevron--gold" aria-hidden="true">
              {expandedTransformation ? "▲" : "▼"}
            </span>
          </button>
          {expandedTransformation && (
            <div className="mmh-transformation-body">
              <p className="mmh-transformation-intro">
                Your answers on Day 1 and Day 30, side by side. Notice what has shifted.
              </p>
              <div className="mmh-transformation-pairs">
                {TRANSFORMATION_PAIRS.map(({ label, beforeKey, afterKey }) => {
                  const beforeItem = beforeSnapshot.find((item) => item.questionKey === beforeKey);
                  const afterItem  = afterSnapshot.find((item) => item.questionKey === afterKey);
                  if (!beforeItem?.response && !afterItem?.response) return null;
                  return (
                    <div key={beforeKey} className="mmh-transformation-pair">
                      <p className="mmh-transformation-pair-label">{label}</p>
                      <div className="mmh-transformation-cols">
                        <div className="mmh-transformation-col">
                          <p className="mmh-transformation-col-label">Day 1</p>
                          <p className="mmh-transformation-answer">
                            {beforeItem?.response || <span className="mmh-snapshot-empty">—</span>}
                          </p>
                        </div>
                        <div className="mmh-transformation-col">
                          <p className="mmh-transformation-col-label">Day 30</p>
                          <p className="mmh-transformation-answer">
                            {afterItem?.response || <span className="mmh-snapshot-empty">—</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reference sections ──────────────────────────────────────────── */}
      {referenceSections.length > 0 && (
        <div className="mmh-refs">
          <h2 className="mmh-section-heading">Reference</h2>
          {referenceSections.map((section) => (
            <div key={section.id} className="mmh-ref-block">
              <button
                className={`mmh-ref-btn ${expandedRef === section.id ? "mmh-ref-btn--open" : ""}`}
                type="button"
                onClick={() =>
                  setExpandedRef((prev) => (prev === section.id ? null : section.id))
                }
              >
                <span aria-hidden="true">📖</span>
                {section.title}
                <span className="mmh-chevron" aria-hidden="true">
                  {expandedRef === section.id ? "▲" : "▼"}
                </span>
              </button>
              {expandedRef === section.id && (
                <div className="mmh-ref-content mmh-md">
                  <ReactMarkdown>{section.content || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showMicroWin && (
        <MicroWinModal
          userId={userId}
          journalId={journal.id}
          dayNumber={progress.currentDay}
          onClose={() => {
            setShowMicroWin(false);
            if (userId && journal?.id) {
              getUserWins(userId, journal.id).then(setWins);
            }
          }}
        />
      )}
    </div>
  );
}

export default MoneyMagicHome;
