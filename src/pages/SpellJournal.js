import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserJournal, deleteJournalEntry, getRecentEntries } from "../journalService";
import { HiOutlineTrash, HiOutlineStar } from "react-icons/hi";
import { HiStar } from "react-icons/hi";
import "./SpellJournal.css";
import MoonPhaseWidget from "../components/MoonPhaseWidget";

function SpellJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, recent, high-rated
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

    if (filter === "recent") {
      return getRecentEntries(filtered, 10);
    } else if (filter === "high-rated") {
      filtered = filtered.filter((e) => (e.rating ?? 0) >= 4);
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
          <div className="empty-icon">✨</div>
          <h2>Ready to start journaling?</h2>
          <p>
            Track which spells you've tried, how they worked, and what magic happened. Your
            practice, your way.
          </p>
          <button className="browse-btn" onClick={() => navigate("/library")} type="button">
            Browse Spells
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
              All Entries
            </button>
            <button
              className={filter === "recent" ? "active" : ""}
              onClick={() => setFilter("recent")}
              type="button"
            >
              Recent (10)
            </button>
            <button
              className={filter === "high-rated" ? "active" : ""}
              onClick={() => setFilter("high-rated")}
              type="button"
            >
              High Rated (4-5★)
            </button>
          </div>

          <div className="journal-entries">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="journal-entry">
                <div className="entry-header">
                  <div className="entry-title-section">
                    <h3
                      onClick={() => navigate(`/spell/${entry.spellId}`)}
                      className="spell-link"
                    >
                      {entry.spellTitle}
                    </h3>
                    <span className="entry-date">{formatDate(entry.date)}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                    type="button"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>

                {entry.rating ? <div className="entry-rating">{renderStars(entry.rating)}</div> : null}

                {entry.notes ? <p className="entry-notes">{entry.notes}</p> : null}

                {entry.tags && entry.tags.length > 0 ? (
                  <div className="entry-tags">
                    {entry.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SpellJournal;