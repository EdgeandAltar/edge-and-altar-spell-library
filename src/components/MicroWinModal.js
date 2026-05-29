import React, { useEffect, useRef, useState } from "react";
import { addMicroWin } from "../services/moneyMagicService";
import "./MicroWinModal.css";

function MicroWinModal({ userId, journalId, dayNumber, onClose }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setError(null);
    setSaving(true);
    const result = await addMicroWin(userId, journalId, dayNumber, text);
    if (result) {
      setSaved(true);
      setTimeout(onClose, 900);
    } else {
      setError("Couldn't save your win. Please try again.");
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="mwm-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Add a Micro-Win">
      <div className="mwm-modal">
        <button className="mwm-close" type="button" onClick={onClose} aria-label="Close">✕</button>

        <p className="mwm-eyebrow">Money Magic Journal</p>
        <h2 className="mwm-title">Add a Micro-Win</h2>
        <p className="mwm-subtitle">
          What small win happened today? A lucky find, a shifted thought, a moment of ease around money. Anything counts.
        </p>

        <textarea
          ref={textareaRef}
          className="mwm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Found $5 in my coat pocket. Noticed I didn't panic about the bill."
          rows={4}
          disabled={saving || saved}
        />

        {error && <p className="mwm-error">{error}</p>}

        <div className="mwm-actions">
          <button className="mwm-cancel" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="mwm-submit"
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || saving || saved}
          >
            {saved ? "✦ Saved!" : saving ? "Saving…" : "Save Win"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MicroWinModal;
