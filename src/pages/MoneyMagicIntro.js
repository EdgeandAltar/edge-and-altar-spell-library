import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  getJournalBySlug,
  getFrontMatter,
  getUserProgress,
} from "../services/moneyMagicService";
import "./MoneyMagicIntro.css";

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


function MoneyMagicIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [index, setIndex] = useState(0);
  // Used as a key to trigger the fade-in animation on section change
  const animKeyRef = useRef(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
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

      // If the user already has progress, send them straight to their current day
      const progress = await getUserProgress(session.userId, journalData.id);
      if (!alive) return;
      if (progress) {
        navigate(`/journal/money-magic/day/${progress.currentDay}`, { replace: true });
        return;
      }

      const frontMatter = await getFrontMatter(journalData.id);
      if (!alive) return;

      if (!frontMatter.length) {
        // No intro content in DB — skip straight to snapshot
        navigate("/journal/money-magic/snapshot/before", { replace: true });
        return;
      }

      setSections(frontMatter);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleContinue = () => {
    if (index < sections.length - 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      animKeyRef.current += 1;
      setAnimKey(animKeyRef.current);
      setIndex((i) => i + 1);
    } else {
      navigate("/journal/money-magic/snapshot/before");
    }
  };

  if (loading) {
    return (
      <div className="mmi-gate">
        <p className="mmi-gate-text">Preparing your journal…</p>
      </div>
    );
  }

  const section = sections[index];
  const isLast = index === sections.length - 1;
  const processedContent = (section.content || "").replace(/\n—/g, "\n\n—");

  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    animKeyRef.current += 1;
    setAnimKey(animKeyRef.current);
    setIndex((i) => i - 1);
  };

  return (
    <div className="mmi-page">
      {/* Journal identity */}
      <p className="mmi-eyebrow">Edge &amp; Altar · Money Magic Journal</p>

      {/* Progress dots */}
      <div className="mmi-dots" role="progressbar" aria-valuenow={index + 1} aria-valuemax={sections.length}>
        {sections.map((_, i) => (
          <span
            key={i}
            className={`mmi-dot ${i === index ? "mmi-dot--active" : i < index ? "mmi-dot--done" : ""}`}
          />
        ))}
      </div>

      {/* Section card — key triggers re-mount → fade-in animation */}
      <div className="mmi-card" key={animKey}>
        <p className="mmi-counter">{index + 1} of {sections.length}</p>
        <h2 className="mmi-section-title">{section.sectionTitle}</h2>
        <div className="mm-intro-content">
          <ReactMarkdown>{processedContent}</ReactMarkdown>
        </div>
      </div>

      {/* Privacy note — first section only */}
      {index === 0 && (
        <p className="mmi-privacy-note">
          🔒 Your journal entries are private and protected. Wendy cannot read what you write. Your responses belong only to you.
        </p>
      )}

      {/* Navigation */}
      <div className={`mmi-footer${index > 0 ? " mmi-footer--split" : ""}`}>
        {index > 0 && (
          <button className="mmi-back-btn" onClick={handleBack} type="button">
            ← Back
          </button>
        )}
        <button
          className="mmi-continue-btn"
          onClick={handleContinue}
          type="button"
        >
          {isLast ? "Begin Your Journey →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

export default MoneyMagicIntro;
