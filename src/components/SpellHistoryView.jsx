import React, { useState, useEffect } from "react";
import { HiOutlineTrash, HiOutlinePencilAlt, HiOutlineStar, HiStar, HiOutlineX } from "react-icons/hi";
import { getEntriesForSpell } from "../journalService";
import EnhancedJournalEntryForm from "./EnhancedJournalEntryForm";
import { updateJournalEntry, deleteJournalEntry } from "../journalService";
import "./SpellHistoryView.css";

/**
 * Spell History View - Shows all performances of a single spell
 *
 * Features:
 * - Summary statistics (times performed, avg rating, trend)
 * - Timeline of all performances with full details
 * - Insights and patterns (best time of day, mood correlations, etc.)
 * - Edit/delete individual entries
 * - Expandable detailed view for each entry
 */
function SpellHistoryView({ spell, allEntries, userId, onClose, onUpdate }) {
  const [spellEntries, setSpellEntries] = useState([]);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (allEntries && spell) {
      const entries = getEntriesForSpell(allEntries, spell.id);
      setSpellEntries(entries.sort((a, b) => new Date(b.date) - new Date(a.date)));
      calculateInsights(entries);
    }
  }, [allEntries, spell]);

  const calculateInsights = (entries) => {
    if (!entries || entries.length === 0) {
      setInsights(null);
      return;
    }

    const validRatings = entries.filter(e => e.rating).map(e => e.rating);
    const avgRating = validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      : 0;

    // Calculate trend (last 3 vs first 3)
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

    // Time of day analysis
    const timePatterns = {};
    entries.forEach(entry => {
      if (entry.created_at) {
        const hour = new Date(entry.created_at).getHours();
        let timeOfDay;
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else timeOfDay = "night";

        timePatterns[timeOfDay] = (timePatterns[timeOfDay] || 0) + 1;
      }
    });

    const mostFrequentTime = Object.entries(timePatterns).reduce((max, [time, count]) =>
      count > (max[1] || 0) ? [time, count] : max, ["", 0]
    )[0];

    // Mood analysis
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

    setInsights({
      timesPerformed: entries.length,
      avgRating: avgRating.toFixed(1),
      trend,
      wouldDoAgainPercent: wouldDoAgainEntries.length > 0
        ? Math.round((wouldDoAgainYes / wouldDoAgainEntries.length) * 100)
        : null,
      mostRecentDate: entries[0]?.date,
      mostFrequentTime,
      avgMoodChange: avgMoodChange.toFixed(1),
      moodChangesCount: moodChanges.length
    });
  };

  const handleEditEntry = async (updatedEntry) => {
    const success = await updateJournalEntry(userId, updatedEntry.id, updatedEntry);
    if (success) {
      setEditingEntry(null);
      onUpdate(); // Refresh parent data
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Delete this journal entry? This cannot be undone.")) return;

    const success = await deleteJournalEntry(userId, entryId);
    if (success) {
      setSpellEntries(prev => prev.filter(e => e.id !== entryId));
      onUpdate(); // Refresh parent data
    }
  };

  const renderStars = (rating) => {
    const r = Number(rating || 0);
    return (
      <div className="star-display-history">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= r ? (
            <HiStar key={star} className="star-history filled" />
          ) : (
            <HiOutlineStar key={star} className="star-history" />
          )
        )}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const getMoodEmoji = (mood) => {
    const moodVal = parseInt(mood) || 0;
    if (moodVal === 0) return "?";
    const emojis = {
      1: "😢", 2: "😞", 3: "😐", 4: "😊", 5: "🙂",
      6: "😄", 7: "😃", 8: "😁", 9: "🤩", 10: "✨"
    };
    return emojis[moodVal] || "🌙";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="spell-history-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn-history" onClick={onClose} aria-label="Close">
          <HiOutlineX />
        </button>

        {/* Header */}
        <div className="history-header">
          <h2>📜 Spell History</h2>
          <p className="history-spell-title">{spell.title}</p>
        </div>

        {/* Summary Stats */}
        {insights && (
          <div className="history-stats-section">
            <div className="stat-box">
              <div className="stat-value">{insights.timesPerformed}</div>
              <div className="stat-label">Times Performed</div>
            </div>

            {insights.avgRating > 0 && (
              <div className="stat-box">
                <div className="stat-value">{insights.avgRating} ⭐</div>
                <div className="stat-label">Avg Effectiveness</div>
              </div>
            )}

            {insights.wouldDoAgainPercent !== null && (
              <div className="stat-box">
                <div className="stat-value">{insights.wouldDoAgainPercent}%</div>
                <div className="stat-label">Would Do Again</div>
              </div>
            )}

            {insights.trend && (
              <div className="stat-box">
                <div className="stat-value">
                  {insights.trend === "improving" && "📈"}
                  {insights.trend === "declining" && "📉"}
                  {insights.trend === "consistent" && "➡️"}
                </div>
                <div className="stat-label">
                  {insights.trend === "improving" && "Getting Better"}
                  {insights.trend === "declining" && "Less Effective"}
                  {insights.trend === "consistent" && "Consistent"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights */}
        {insights && insights.timesPerformed > 0 && (
          <div className="insights-section">
            <h3>✨ Insights & Patterns</h3>
            <ul className="insights-list">
              <li>
                You've performed this spell <strong>{insights.timesPerformed}</strong> time{insights.timesPerformed !== 1 ? "s" : ""}.
              </li>

              {insights.avgRating > 0 && (
                <li>
                  Your average effectiveness rating is <strong>{insights.avgRating}/5</strong>
                  {insights.avgRating >= 4 && " — This spell works well for you! ✨"}
                  {insights.avgRating >= 3 && insights.avgRating < 4 && " — Moderately effective."}
                  {insights.avgRating < 3 && " — Consider trying modifications."}
                </li>
              )}

              {insights.wouldDoAgainPercent !== null && insights.wouldDoAgainPercent >= 70 && (
                <li>
                  You said you'd do this spell again <strong>{insights.wouldDoAgainPercent}%</strong> of the time — clearly a favorite! 🌟
                </li>
              )}

              {insights.mostFrequentTime && (
                <li>
                  You most often practice this spell in the <strong>{insights.mostFrequentTime}</strong>.
                </li>
              )}

              {insights.moodChangesCount > 0 && Math.abs(insights.avgMoodChange) > 1 && (
                <li>
                  On average, your mood {insights.avgMoodChange > 0 ? "improves" : "shifts"} by{" "}
                  <strong>{Math.abs(insights.avgMoodChange)}</strong> points after performing this spell.
                </li>
              )}

              {insights.trend === "improving" && (
                <li className="insight-highlight">
                  This spell seems to be <strong>getting more effective</strong> for you over time! 📈
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Timeline */}
        <div className="history-timeline-section">
          <h3>🕰️ Performance Timeline</h3>

          {spellEntries.length === 0 ? (
            <p className="no-entries">No performances recorded yet.</p>
          ) : (
            <div className="history-timeline">
              {spellEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`history-entry-card ${expandedEntry === entry.id ? "expanded" : ""}`}
                >
                  <div className="entry-card-header" onClick={() =>
                    setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                  }>
                    <div className="entry-date-time">
                      <div className="entry-date-main">{formatDate(entry.date)}</div>
                      {entry.rating && renderStars(entry.rating)}
                    </div>
                    <div className="entry-actions">
                      <button
                        className="edit-entry-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntry(entry);
                        }}
                        aria-label="Edit entry"
                      >
                        <HiOutlinePencilAlt />
                      </button>
                      <button
                        className="delete-entry-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                        aria-label="Delete entry"
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </div>

                  {expandedEntry === entry.id && (
                    <div className="entry-expanded-content">
                      {/* Mood Before/After */}
                      {(entry.moodBefore || entry.moodAfter) && (
                        <div className="mood-row">
                          {entry.moodBefore && (
                            <div className="mood-item">
                              <span className="mood-label">Before:</span>
                              <span className="mood-value">
                                {getMoodEmoji(entry.moodBefore)} {entry.moodBefore}/10
                              </span>
                            </div>
                          )}
                          {entry.moodAfter && (
                            <div className="mood-item">
                              <span className="mood-label">After:</span>
                              <span className="mood-value">
                                {getMoodEmoji(entry.moodAfter)} {entry.moodAfter}/10
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Intention */}
                      {entry.intention && (
                        <div className="entry-section">
                          <div className="section-label">💭 Intention:</div>
                          <div className="section-content">{entry.intention}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {entry.notes && (
                        <div className="entry-section">
                          <div className="section-label">📝 Notes:</div>
                          <div className="section-content">{entry.notes}</div>
                        </div>
                      )}

                      {/* Would Do Again */}
                      {entry.wouldDoAgain !== null && (
                        <div className="entry-section">
                          <div className="section-label">Would do again?</div>
                          <div className="section-content">
                            {entry.wouldDoAgain ? "✓ Yes" : "✗ No"}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="entry-tags-section">
                          {entry.tags.map((tag, i) => (
                            <span key={i} className="entry-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {!entry.rating && !entry.notes && !entry.intention && (
                        <p className="quick-log-note">✨ Quick logged as performed</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingEntry && (
          <EnhancedJournalEntryForm
            spell={spell}
            initialEntry={editingEntry}
            onSave={handleEditEntry}
            onCancel={() => setEditingEntry(null)}
          />
        )}
      </div>
    </div>
  );
}

export default SpellHistoryView;
