import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserCustomSpells, deleteCustomSpell, canCreateCustomSpell } from "../services/customSpellsService";
import LoadingSpinner from "../components/LoadingSpinner";
import { HiOutlinePencilAlt, HiOutlineBookOpen, HiOutlineLockClosed } from "react-icons/hi";
import "./SpellLibrary.css";
import "./MyCustomSpells.css";

function MyCustomSpells() {
  const [customSpells, setCustomSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [canCreate, setCanCreate] = useState({ allowed: false, limit: 0, current: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomSpells();
  }, []);

  const fetchCustomSpells = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.id);

      const [spells, createCheck] = await Promise.all([
        getUserCustomSpells(user.id),
        canCreateCustomSpell(user.id),
      ]);

      setCustomSpells(spells);
      setCanCreate(createCheck);
    } catch (err) {
      console.error("[MyCustomSpells] fetch error:", err);
      setError("Error loading custom spells: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (spellId) => {
    if (!userId) return;

    try {
      await deleteCustomSpell(spellId, userId);
      await fetchCustomSpells();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("[MyCustomSpells] delete error:", err);
      alert("Error deleting spell: " + (err?.message || "Unknown error"));
    }
  };

  const handleCreateNew = () => {
    if (!canCreate.allowed) return;
    navigate("/custom-spells/new");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const spellCountText = canCreate.limit === Infinity
    ? `${canCreate.current} custom spell${canCreate.current !== 1 ? "s" : ""} created`
    : `${canCreate.current} of ${canCreate.limit} custom spells created`;

  return (
    <div className="custom-spells-page">
      {/* Hero Section */}
      <div className="library-hero">
        <div className="hero-image-container">
          <img
            src="/images/collections-hero.png"
            alt="Custom spells workspace"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="library-header">
          <h1>Your Personal Grimoire</h1>
          <p className="subtitle">Create spells that fit your actual life</p>
          <p className="subtitle" style={{ fontSize: "14px", marginTop: "8px", opacity: 0.85 }}>
            {spellCountText}
          </p>
        </div>
      </div>

      {error && (
        <div className="mcs-error">{error}</div>
      )}

      {/* Spells Grid (when user has spells) */}
      {customSpells.length > 0 ? (
        <div className="mcs-content">
          <div className="mcs-top-bar">
            {canCreate.allowed ? (
              <button className="mcs-create-btn" onClick={handleCreateNew} type="button">
                + Create New Spell
              </button>
            ) : (
              <button className="mcs-upgrade-btn" onClick={() => navigate("/subscribe")} type="button">
                Upgrade for Unlimited Spells
              </button>
            )}
          </div>

          <div className="spell-grid">
            {customSpells.map((spell) => (
              <div key={spell.id} className="spell-card" style={{ position: "relative" }}>
                {spell.image_url && (
                  <img
                    src={spell.image_url}
                    alt={spell.title}
                    className="spell-image"
                  />
                )}
                <div className="spell-content">
                  <div className="spell-badges">
                    <span className="custom-badge" style={{
                      background: "#7D5E4F",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>Custom</span>
                    {spell.category && <span className="category">{spell.category}</span>}
                  </div>
                  <h3>{spell.title}</h3>

                  <div className="mcs-card-actions">
                    <button
                      className="mcs-action-view"
                      onClick={() => navigate(`/spell/${spell.id}`)}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="mcs-action-edit"
                      onClick={() => navigate(`/custom-spells/edit/${spell.id}`)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="mcs-action-delete"
                      onClick={() => setDeleteConfirm(spell.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="mcs-content">
          {/* Feature Cards */}
          <div className="mcs-features">
            <div className="mcs-feature-card">
              <div className="mcs-feature-icon"><HiOutlinePencilAlt /></div>
              <h3>Start from Scratch</h3>
              <p>
                Build a spell from the ground up using our guided template.
                Add your own ingredients, words, and rituals.
              </p>
            </div>

            <div className="mcs-feature-card">
              <div className="mcs-feature-icon"><HiOutlineBookOpen /></div>
              <h3>Modify Library Spells</h3>
              <p>
                Copy any spell from the library and make it yours. Swap ingredients,
                change the timing, rewrite the words to match your voice.
              </p>
            </div>

            <div className="mcs-feature-card">
              <div className="mcs-feature-icon"><HiOutlineLockClosed /></div>
              <h3>Private & Integrated</h3>
              <p>
                Your custom spells work seamlessly with favorites, journal, and tracking.
                They're private — only you can see them.
              </p>
            </div>
          </div>

          {/* Empty state message */}
          <div className="mcs-empty-state">
            <p className="mcs-empty-text">
              You haven't created any custom spells yet. When you do, they'll appear here.
            </p>

            {canCreate.allowed ? (
              <button className="mcs-create-btn mcs-create-btn-lg" onClick={handleCreateNew} type="button">
                + Create Your First Spell
              </button>
            ) : (
              <div className="mcs-limit-box">
                <h3>Custom Spell Limit Reached</h3>
                <p>
                  You've created {canCreate.current} of {canCreate.limit} free custom spells.
                </p>
                <button className="mcs-upgrade-btn" onClick={() => navigate("/subscribe")} type="button">
                  Upgrade to Premium for Unlimited Custom Spells
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="mcs-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="mcs-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Custom Spell?</h3>
            <p>Are you sure you want to delete this custom spell? This action cannot be undone.</p>
            <div className="mcs-modal-actions">
              <button className="mcs-modal-cancel" onClick={() => setDeleteConfirm(null)} type="button">
                Cancel
              </button>
              <button className="mcs-modal-delete" onClick={() => handleDelete(deleteConfirm)} type="button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCustomSpells;
