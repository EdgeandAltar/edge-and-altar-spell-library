import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { generateSpellPDF } from "../pdfService";
import { addJournalEntry } from "../journalService";
import {
  HiOutlineHeart,
  HiHeart,
  HiOutlineDownload,
  HiOutlinePencilAlt,
} from "react-icons/hi";
import "./SpellDetail.css";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function SpellDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [spell, setSpell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [userSubscription, setUserSubscription] = useState("free");
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const [favorites, setFavorites] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalRating, setJournalRating] = useState(0);
  const [journalNotes, setJournalNotes] = useState("");
  const [journalTags, setJournalTags] = useState([]);

  const [relatedSpells, setRelatedSpells] = useState([]);

  // Get session from localStorage
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
      console.warn("[SpellDetail] Failed to get session from storage:", err);
      return null;
    }
  };

  const fetchAccessLevel = async (token, uid) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=access_level`,
        {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn("[SpellDetail] profiles fetch failed:", response.status);
        return "free";
      }

      const data = await response.json();
      return data?.[0]?.access_level === "premium" ? "premium" : "free";
    } catch (err) {
      console.warn("[SpellDetail] fetchAccessLevel error:", err);
      return "free";
    }
  };

  const fetchSpell = async (token) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/spells?id=eq.${id}&select=id,title,when_to_use,category,time_required,skill_level,seasonal_tags,tags,is_premium,image_url,created_at,legacy_id,vibe,supplies_needed,ingredients,instructions,why_this_works,spoken_intention,tips`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch spell: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const s = data[0];
    return {
      id: s.id,
      title: s.title,
      whenToUse: s.when_to_use,
      category: s.category,
      timeRequired: s.time_required,
      skillLevel: s.skill_level,
      seasonalTags: Array.isArray(s.seasonal_tags) ? s.seasonal_tags : [],
      tags: Array.isArray(s.tags) ? s.tags : [],
      isPremium: Boolean(s.is_premium),
      imageUrl: s.image_url,
      createdAt: s.created_at,
      legacyId: s.legacy_id,
      vibe: s.vibe ?? "",
      suppliesNeeded: s.supplies_needed ?? "",
      ingredients: s.ingredients ?? "",
      instructions: s.instructions ?? "",
      whyThisWorks: s.why_this_works ?? "",
      spokenIntention: s.spoken_intention ?? "",
      tips: s.tips ?? "",
    };
  };

  const fetchFavorites = async (token, uid) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${uid}&select=spell_id`,
        {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn("[SpellDetail] favorites fetch failed:", response.status);
        return [];
      }

      const data = await response.json();
      return (data || []).map((row) => String(row.spell_id));
    } catch (err) {
      console.warn("[SpellDetail] fetchFavorites error:", err);
      return [];
    }
  };

  const toggleFavorite = async () => {
    if (!accessToken || !userId || !spell) return;

    const sid = String(spell.id);

    try {
      if (isFavorited) {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${userId}&spell_id=eq.${sid}`,
          {
            method: "DELETE",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error("[favorites] delete failed:", response.status);
          return;
        }

        setFavorites((prev) => prev.filter((x) => x !== sid));
        setIsFavorited(false);
      } else {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites`,
          {
            method: "POST",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ user_id: userId, spell_id: sid }),
          }
        );

        if (!response.ok) {
          console.error("[favorites] insert failed:", response.status);
          return;
        }

        setFavorites((prev) => [...prev, sid]);
        setIsFavorited(true);
      }
    } catch (err) {
      console.error("[favorites] toggle error:", err);
    }
  };

  const handleAddToJournal = async () => {
    if (!userId || !spell) {
      alert("Please log in to add journal entries.");
      return;
    }

    const entry = await addJournalEntry(userId, {
      spellId: spell.id,
      spellTitle: spell.title,
      rating: journalRating,
      notes: journalNotes,
      tags: journalTags,
    });

    if (entry) {
      alert("Added to your journal!");
      setShowJournalModal(false);
      setJournalRating(0);
      setJournalNotes("");
      setJournalTags([]);
    } else {
      alert("Failed to add to journal. Please try again.");
    }
  };

  const addTag = (tag) => {
    if (tag && !journalTags.includes(tag)) setJournalTags((prev) => [...prev, tag]);
  };

  const removeTag = (tagToRemove) => {
    setJournalTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleDownloadPDF = () => {
    if (spell) generateSpellPDF(spell);
  };

  const findRelatedSpells = async (token, currentSpell, subscription) => {
    if (!currentSpell) return;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/spells?select=id,title,category,time_required,skill_level,is_premium,image_url&order=created_at.desc`,
        {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn("[SpellDetail] related spells fetch failed:", response.status);
        return;
      }

      const data = await response.json();

      const allSpells = (data || []).map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        timeRequired: s.time_required,
        skillLevel: s.skill_level,
        isPremium: Boolean(s.is_premium),
        imageUrl: s.image_url,
      }));

      const scored = allSpells
        .filter((s) => s.id !== currentSpell.id)
        .filter((s) => (subscription === "free" ? !s.isPremium : true))
        .map((s) => {
          let score = 0;
          if (s.category === currentSpell.category) score += 3;
          if (s.timeRequired === currentSpell.timeRequired) score += 2;
          if (s.skillLevel === currentSpell.skillLevel) score += 1;
          return { ...s, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      setRelatedSpells(scored);
    } catch (err) {
      console.error("Error finding related spells:", err);
    }
  };

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setPageError("");

      try {
        const session = getSessionFromStorage();

        if (!session?.accessToken || !session?.user) {
          if (alive) {
            setAccessToken(null);
            setUserId(null);
            setSpell(null);
            setLoading(false);
          }
          return;
        }

        setAccessToken(session.accessToken);
        setUserId(session.user.id);

        const spellData = await fetchSpell(session.accessToken);
        if (!alive) return;

        if (!spellData) {
          setSpell(null);
          setLoading(false);
          return;
        }

        setSpell(spellData);

        const [level, favs] = await Promise.all([
          fetchAccessLevel(session.accessToken, session.user.id),
          fetchFavorites(session.accessToken, session.user.id),
        ]);

        if (!alive) return;

        setUserSubscription(level);
        setFavorites(favs);
        setIsFavorited(favs.includes(String(spellData.id)));

        await findRelatedSpells(session.accessToken, spellData, level);
      } catch (err) {
        console.error("[SpellDetail] load error:", err);
        if (!alive) return;
        setPageError(err?.message || "Failed to load spell.");
        setSpell(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading spell..." />;

  if (pageError) {
    return (
      <div className="error-container">
        <h2>Couldn't load spell</h2>
        <p style={{ opacity: 0.8 }}>{pageError}</p>
        <button onClick={() => navigate("/library")}>Back to Library</button>
      </div>
    );
  }

  if (!spell) {
    return (
      <div className="error-container">
        <h2>Spell not found</h2>
        <button onClick={() => navigate("/library")}>Back to Library</button>
      </div>
    );
  }

  if (spell.isPremium && userSubscription === "free") {
    return (
      <div className="spell-detail-container">
        <button className="back-button" onClick={() => navigate("/library")}>
          ← Back to Library
        </button>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "60px 40px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🔒</div>
          <h2 style={{ color: "#7D5E4F", marginBottom: "16px" }}>Premium Spell</h2>
          <p style={{ color: "#7d6e57", fontSize: "18px", marginBottom: "32px" }}>
            This spell is only available to premium members.
          </p>
          <button
            onClick={() => navigate("/subscribe")}
            style={{
              padding: "16px 32px",
              background: "#7D5E4F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spell-detail-container">
      <button className="back-button" onClick={() => navigate("/library")}>
        ← Back to Library
      </button>

      <div className="spell-detail">
        {spell.imageUrl && <img src={spell.imageUrl} alt={spell.title} className="spell-detail-image" />}

        <div className="spell-header">
          <div className="spell-title-row">
            <h1>{spell.title}</h1>

            <button className="download-btn-detail" onClick={handleDownloadPDF} type="button">
              <HiOutlineDownload /> Download PDF
            </button>

            <div className="header-actions">
              <button
                className="journal-btn-detail"
                onClick={() => setShowJournalModal(true)}
                type="button"
              >
                <HiOutlinePencilAlt /> Add to Journal
              </button>

              <button
                className="favorite-btn-detail"
                onClick={toggleFavorite}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                type="button"
              >
                {isFavorited ? (
                  <HiHeart className="heart-icon-detail filled" />
                ) : (
                  <HiOutlineHeart className="heart-icon-detail" />
                )}
              </button>
            </div>
          </div>

          <div className="spell-tags">
            {spell.isPremium && <span className="tag premium">Premium</span>}
            <span className="tag">{spell.category}</span>
            <span className="tag">{spell.timeRequired}</span>
            <span className="tag">{spell.skillLevel}</span>
          </div>
        </div>

        <section className="spell-section">
          <h2>When to Use</h2>
          <p>{spell.whenToUse}</p>
        </section>

        {spell.vibe && (
          <section className="spell-section">
            <h2>Vibe</h2>
            <p>{spell.vibe}</p>
          </section>
        )}

        {spell.suppliesNeeded && (
          <section className="spell-section">
            <h2>Supplies Needed</h2>
            <p>{spell.suppliesNeeded}</p>
          </section>
        )}

        <section className="spell-section">
          <h2>What You Need</h2>
          <ul className="ingredients-list">
            {spell.ingredients?.split("\n").map((ingredient, index) => ingredient.trim() && <li key={index}>{ingredient}</li>)}
          </ul>
        </section>

        <section className="spell-section">
          <h2>How to Do It</h2>
          <div className="instructions">
            {spell.instructions?.split("\n").map((line, index) => line.trim() && <p key={index}>{line}</p>)}
          </div>
        </section>

        {spell.whyThisWorks && (
          <section className="spell-section why-section">
            <h2>Why This Works</h2>
            <p className="why-text">{spell.whyThisWorks}</p>
          </section>
        )}

        {spell.spokenIntention && (
          <section className="spell-section intention">
            <h2>Spoken Intention</h2>
            <blockquote>"{spell.spokenIntention}"</blockquote>
          </section>
        )}

        {spell.tips && (
          <section className="spell-section">
            <h2>Tips & Modifications</h2>
            <p>{spell.tips}</p>
          </section>
        )}
      </div>

      {relatedSpells.length > 0 && (
        <div className="related-spells-section">
          <h2>You Might Also Like</h2>
          <div className="related-spells-grid">
            {relatedSpells.map((relatedSpell) => (
              <div
                key={relatedSpell.id}
                className="related-spell-card"
                onClick={() => navigate(`/spell/${relatedSpell.id}`)}
              >
                {relatedSpell.imageUrl && <img src={relatedSpell.imageUrl} alt={relatedSpell.title} />}
                <div className="related-spell-content">
                  <h4>{relatedSpell.title}</h4>
                  <div className="related-spell-meta">
                    <span>{relatedSpell.category}</span>
                    <span>•</span>
                    <span>{relatedSpell.timeRequired}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showJournalModal && (
        <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
          <div className="journal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Journal</h2>
            <p className="modal-subtitle">{spell.title}</p>

            <div className="modal-section">
              <label>How effective was it?</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= journalRating ? "filled" : ""}`}
                    onClick={() => setJournalRating(star)}
                    type="button"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <label>Notes (optional)</label>
              <textarea
                placeholder="How did it feel? What happened? Any modifications you made?"
                value={journalNotes}
                onChange={(e) => setJournalNotes(e.target.value)}
                rows="4"
              />
            </div>

            <div className="modal-section">
              <label>Quick Tags (optional)</label>
              <div className="tag-suggestions">
                {["worked well", "felt powerful", "subtle shift", "will try again", "modified it"].map((tag) => (
                  <button key={tag} className="tag-btn" onClick={() => addTag(tag)} type="button">
                    + {tag}
                  </button>
                ))}
              </div>

              {journalTags.length > 0 && (
                <div className="selected-tags">
                  {journalTags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                      <button onClick={() => removeTag(tag)} type="button">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowJournalModal(false)} type="button">
                Cancel
              </button>
              <button className="save-btn" onClick={handleAddToJournal} type="button">
                Save to Journal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpellDetail;