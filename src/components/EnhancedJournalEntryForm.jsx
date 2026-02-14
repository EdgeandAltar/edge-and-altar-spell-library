import React, { useState } from "react";
import { HiOutlineStar, HiStar, HiOutlineX } from "react-icons/hi";
import "./EnhancedJournalEntryForm.css";

/**
 * Enhanced Journal Entry Form - A magical grimoire-style spell tracking form
 *
 * Features:
 * - Before/after mood tracking (1-10 scale with emoji indicators)
 * - Intention setting (what do you hope this spell does?)
 * - Effectiveness rating (1-5 stars)
 * - Would you do this again? (yes/no)
 * - Custom tags for categorization
 * - Two modes: Quick Log (just date) or Extended Journal (all fields)
 */
function EnhancedJournalEntryForm({
  spell,
  onSave,
  onCancel,
  initialEntry = null // For editing existing entries
}) {
  const [mode, setMode] = useState(initialEntry ? "extended" : "quick"); // "quick" or "extended"

  // Form fields
  const [entryDate, setEntryDate] = useState(
    initialEntry?.date || new Date().toISOString().split('T')[0]
  );
  const [moodBefore, setMoodBefore] = useState(initialEntry?.moodBefore || "");
  const [moodAfter, setMoodAfter] = useState(initialEntry?.moodAfter || "");
  const [intention, setIntention] = useState(initialEntry?.intention || "");
  const [notes, setNotes] = useState(initialEntry?.notes || "");
  const [rating, setRating] = useState(initialEntry?.rating || 0);
  const [wouldDoAgain, setWouldDoAgain] = useState(initialEntry?.wouldDoAgain ?? null);
  const [tags, setTags] = useState(initialEntry?.tags || []);
  const [isPrivate, setIsPrivate] = useState(initialEntry?.isPrivate ?? false);

  const [hoveredStar, setHoveredStar] = useState(0);
  const [customTagInput, setCustomTagInput] = useState("");

  // Mood scale with emoji indicators
  const moodEmojis = {
    1: "😢", 2: "😞", 3: "😐", 4: "😊", 5: "🙂",
    6: "😄", 7: "😃", 8: "😁", 9: "🤩", 10: "✨"
  };

  // Suggested tags
  const suggestedTags = [
    "actually worked",
    "felt powerful",
    "subtle shift",
    "will try again",
    "modified it",
    "felt silly",
    "calming",
    "energizing",
    "emotional release",
    "grounding",
    "clarity",
    "protection"
  ];

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addCustomTag = () => {
    if (customTagInput.trim()) {
      addTag(customTagInput.trim());
      setCustomTagInput("");
    }
  };

  const handleSubmit = () => {
    const entry = {
      spellId: spell.id,
      spellTitle: spell.title,
      date: entryDate,
      rating: mode === "extended" ? rating : null,
      notes: notes.trim() || "",
      tags,
      moodBefore: mode === "extended" ? moodBefore : null,
      moodAfter: mode === "extended" ? moodAfter : null,
      intention: mode === "extended" ? intention : null,
      wouldDoAgain: mode === "extended" ? wouldDoAgain : null,
      isPrivate
    };

    if (initialEntry) {
      entry.id = initialEntry.id;
    }

    onSave(entry);
  };

  const renderMoodScale = (value, onChange, label) => {
    return (
      <div className="mood-scale-container">
        <label className="grimoire-label">{label}</label>
        <div className="mood-scale">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              className={`mood-button ${value === num ? "selected" : ""}`}
              onClick={() => onChange(String(num))}
              title={`${num}/10`}
            >
              <span className="mood-emoji">{moodEmojis[num]}</span>
              <span className="mood-number">{num}</span>
            </button>
          ))}
        </div>
        {value && (
          <div className="mood-selected">
            Selected: {moodEmojis[parseInt(value) || 5]} {value}/10
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="enhanced-journal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
          <HiOutlineX />
        </button>

        {/* Header with parchment aesthetic */}
        <div className="grimoire-header">
          <h2>📖 Record Your Practice</h2>
          <p className="spell-subtitle">{spell.title}</p>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === "quick" ? "active" : ""}`}
            onClick={() => setMode("quick")}
          >
            ⚡ Quick Log
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "extended" ? "active" : ""}`}
            onClick={() => setMode("extended")}
          >
            🪶 Extended Journal
          </button>
        </div>

        <div className="journal-form-content">
          {/* Required: Date */}
          <div className="grimoire-section">
            <label className="grimoire-label">When did you perform this spell?</label>
            <input
              type="date"
              className="grimoire-input date-input"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {mode === "extended" && (
            <>
              {/* Before Mood */}
              {renderMoodScale(
                moodBefore,
                setMoodBefore,
                "How are you feeling right now?"
              )}

              {/* Intention */}
              <div className="grimoire-section">
                <label className="grimoire-label">
                  What do you hope this spell does for you?
                </label>
                <textarea
                  className="grimoire-textarea"
                  placeholder="Set your intention here... What are you hoping to manifest, release, or transform?"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  rows="3"
                />
              </div>

              {/* Performance Notes */}
              <div className="grimoire-section">
                <label className="grimoire-label">
                  Performance notes (optional)
                </label>
                <textarea
                  className="grimoire-textarea"
                  placeholder="How did it feel? What happened? Any modifications you made? Let your thoughts flow..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                />
              </div>

              {/* After Mood */}
              {renderMoodScale(
                moodAfter,
                setMoodAfter,
                "How are you feeling now?"
              )}

              {/* Effectiveness Rating */}
              <div className="grimoire-section">
                <label className="grimoire-label">Did this spell help?</label>
                <div className="star-rating-large">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="star-btn-large"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                    >
                      {star <= (hoveredStar || rating) ? (
                        <HiStar className="star-icon filled" />
                      ) : (
                        <HiOutlineStar className="star-icon" />
                      )}
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="rating-text">
                    {rating === 5 && "✨ Incredibly effective!"}
                    {rating === 4 && "🌟 Very helpful"}
                    {rating === 3 && "⭐ Somewhat helpful"}
                    {rating === 2 && "💫 Subtle effect"}
                    {rating === 1 && "🌙 Minimal effect"}
                  </p>
                )}
              </div>

              {/* Would Do Again */}
              <div className="grimoire-section">
                <label className="grimoire-label">Would you do this spell again?</label>
                <div className="yes-no-buttons">
                  <button
                    type="button"
                    className={`yn-btn ${wouldDoAgain === true ? "selected yes" : ""}`}
                    onClick={() => setWouldDoAgain(true)}
                  >
                    ✓ Yes
                  </button>
                  <button
                    type="button"
                    className={`yn-btn ${wouldDoAgain === false ? "selected no" : ""}`}
                    onClick={() => setWouldDoAgain(false)}
                  >
                    ✗ No
                  </button>
                  <button
                    type="button"
                    className={`yn-btn ${wouldDoAgain === null ? "selected" : ""}`}
                    onClick={() => setWouldDoAgain(null)}
                  >
                    ? Unsure
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="grimoire-section">
                <label className="grimoire-label">Add tags to categorize this experience</label>

                <div className="tag-suggestions">
                  {suggestedTags
                    .filter(tag => !tags.includes(tag))
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="suggested-tag-btn"
                        onClick={() => addTag(tag)}
                      >
                        + {tag}
                      </button>
                    ))}
                </div>

                <div className="custom-tag-input-container">
                  <input
                    type="text"
                    className="custom-tag-input"
                    placeholder="Create your own tag..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={addCustomTag}
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="selected-tags-grimoire">
                    {tags.map((tag) => (
                      <span key={tag} className="tag-grimoire">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy Toggle */}
              <div className="grimoire-section privacy-section">
                <label className="privacy-label">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span>Keep this entry private</span>
                </label>
                <p className="privacy-note">
                  Your journal is always private by default. This toggle is for future community features.
                </p>
              </div>
            </>
          )}

          {mode === "quick" && (
            <div className="quick-log-info">
              <p className="quick-log-message">
                📝 Quick logging this spell as performed. Switch to Extended Journal above to add reflections, mood tracking, and more.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grimoire-actions">
          <button
            type="button"
            className="grimoire-btn cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="grimoire-btn save"
            onClick={handleSubmit}
          >
            {initialEntry ? "Update Entry" : "Your practice has been recorded"} ✨
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedJournalEntryForm;
