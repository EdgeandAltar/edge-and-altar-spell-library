import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserJournal,
  deleteJournalEntry,
  groupEntriesByDate,
  formatTimelineDate,
  getMoonPhaseForDate,
} from "../journalService";
import { HiOutlineTrash, HiOutlineStar } from "react-icons/hi";
import { HiStar } from "react-icons/hi";
import "./SpellJournal.css";
import MoonPhaseWidget from "../components/MoonPhaseWidget";

function SpellJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, this-month, with-notes
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Get user ID from localStorage
  const getSessionFromStorage = () => {
    try {
      const storageKey = Object.keys(localStorage).find(
        (k) => k.includes("sb-") && k.includes("-auth-token")
      );

      if (!storageKey) return null;

      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return {
        accessToken: parsed?.access_token,
        user: parsed?.user,
      };
    } catch (err) {
      console.warn("[SpellJournal] Failed to get session from storage:", err);
      return null;
    }
  };

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      try {
        const session = getSessionFromStorage();
        const user = session?.user;

        if (!user?.id) {
          if (!alive) return;
          setUserId(null);
          setEntries([]);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const journalEntries = await getUserJournal(user.id);

        if (!alive) return;
        setEntries(journalEntries || []);
      } catch (err) {
        console.error("[SpellJournal] loadJournal error:", err);
        if (!alive) return;
        setEntries([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const handleDelete = async (entryId) => {
    if (!window.confirm("Delete this journal entry?")) return;

    try {
      if (!userId) {
        navigate("/login");
        return;
      }

      const success = await deleteJournalEntry(userId, entryId);
      if (success) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch (err) {
      console.error("[SpellJournal] delete error:", err);
    }
  };

  const getFilteredEntries = () => {
    let filtered = [...entries];

    if (filter === "this-month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => new Date(e.date) >= startOfMonth);
    } else if (filter === "with-notes") {
      filtered = filtered.filter((e) => e.notes && e.notes.trim() !== "");
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const renderStars = (rating) => {
    const r = Number(rating || 0);
    return (
      <div className="star-display">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= r ? (
            <HiStar key={star} className="star filled" />
          ) : (
            <HiOutlineStar key={star} className="star" />
          )
        )}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="journal-container">
        <p>Loading your journal...</p>
      </div>
    );
  }

  const filteredEntries = getFilteredEntries();

  return (
    <div className="journal-container">
      {/* Hero Section with Image */}
      <div className="journal-hero">
        <div className="hero-image-container">
          <img
            src="/images/journal-hero.png"
            alt="Journal and ritual reflection"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="journal-header">
          <h1>My Spell Journal</h1>
          <p className="subtitle">
            {entries.length === 0
              ? "Start tracking your magical practice"
              : `${entries.length} spell${entries.length === 1 ? "" : "s"} recorded`}
          </p>
        </div>
      </div>

      <MoonPhaseWidget />

      {entries.length === 0 ? (
        <div className="empty-journal">
          <div className="empty-icon">🌙</div>
          <h2>Your sanctuary awaits</h2>
          <p>
            Begin tracking your magical practice. Each spell you log becomes part of your personal grimoire,
            a record of your journey through the craft.
          </p>
          <button className="browse-btn" onClick={() => navigate("/library")} type="button">
            Explore Spell Library
          </button>
        </div>
      ) : (
        <>
          <div className="journal-filters">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
              type="button"
            >
              All Time
            </button>
            <button
              className={filter === "this-month" ? "active" : ""}
              onClick={() => setFilter("this-month")}
              type="button"
            >
              This Month
            </button>
            <button
              className={filter === "with-notes" ? "active" : ""}
              onClick={() => setFilter("with-notes")}
              type="button"
            >
              With Reflections
            </button>
          </div>

          <div className="timeline-container">
            {Object.entries(groupEntriesByDate(filteredEntries)).map(([dateKey, dayEntries]) => (
              <div key={dateKey} className="timeline-date-group">
                <div className="date-divider">
                  <div className="date-header">
                    <span className="moon-phase-emoji">{getMoonPhaseForDate(dateKey)}</span>
                    <h3>{formatTimelineDate(dateKey)}</h3>
                  </div>
                  <div className="date-line"></div>
                </div>

                <div className="timeline-entries">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="timeline-entry">
                      <div className="entry-type-indicator">
                        {entry.rating || entry.notes ? (
                          <span className="detailed-icon">🪶</span>
                        ) : (
                          <span className="quick-log-icon">✓</span>
                        )}
                      </div>

                      <div className="entry-content">
                        <div className="entry-header">
                          <h4
                            onClick={() => navigate(`/spell/${entry.spellId}`)}
                            className="spell-link"
                          >
                            {entry.spellTitle}
                          </h4>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(entry.id)}
                            aria-label="Delete entry"
                            type="button"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>

                        {entry.rating && <div className="entry-rating">{renderStars(entry.rating)}</div>}

                        {entry.notes && <p className="entry-notes">{entry.notes}</p>}

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="entry-tags">
                            {entry.tags.map((tag, i) => (
                              <span key={i} className="tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {!entry.rating && !entry.notes && (
                          <p className="quick-log-message">Logged as performed ✨</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="timeline-stats">
            <div className="stat-card">
              <span className="stat-number">{entries.length}</span>
              <span className="stat-label">spells logged</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {entries.filter((e) => e.notes && e.notes.trim() !== "").length}
              </span>
              <span className="stat-label">with reflections</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{new Set(entries.map((e) => e.spellId)).size}</span>
              <span className="stat-label">unique spells</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SpellJournal;