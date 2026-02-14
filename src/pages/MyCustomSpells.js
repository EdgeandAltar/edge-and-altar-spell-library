import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserCustomSpells, deleteCustomSpell, canCreateCustomSpell } from "../services/customSpellsService";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SpellLibrary.css"; // Reuse spell library styles

function MyCustomSpells() {
  const [customSpells, setCustomSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [canCreate, setCanCreate] = useState({ allowed: false, limit: 0, current: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // ID of spell to delete
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

      // Fetch custom spells and check creation eligibility in parallel
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
      // Refresh the list
      await fetchCustomSpells();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("[MyCustomSpells] delete error:", err);
      alert("Error deleting spell: " + (err?.message || "Unknown error"));
    }
  };

  const handleCreateNew = () => {
    if (!canCreate.allowed) {
      // Show upgrade message (handled in UI)
      return;
    }
    navigate("/custom-spells/new");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="spell-library-container">
      <div className="library-header">
        <h1>My Custom Spells</h1>
        <p className="library-subtitle">
          {canCreate.limit === Infinity
            ? `You have ${canCreate.current} custom spell${canCreate.current !== 1 ? "s" : ""}`
            : `${canCreate.current} of ${canCreate.limit} custom spells created`}
        </p>
      </div>

      {/* Privacy Info Box */}
      <div
        style={{
          background: "#f5f3ef",
          border: "1px solid #d4c5b9",
          borderRadius: "8px",
          padding: "16px 20px",
          margin: "0 auto 30px",
          maxWidth: "800px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#5a5a5a", fontSize: "14px", lineHeight: "1.5" }}>
          <strong>Your spells are private.</strong> Custom spells you create are only visible to you.
          They work seamlessly with your favorites and journal, just like library spells.
        </p>
      </div>

      {error && <div className="error-message" style={{ margin: "20px auto", maxWidth: "800px" }}>{error}</div>}

      {/* Create New Button */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        {canCreate.allowed ? (
          <button
            onClick={handleCreateNew}
            style={{
              padding: "12px 24px",
              background: "#7D5E4F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#6a4f42")}
            onMouseOut={(e) => (e.target.style.background = "#7D5E4F")}
          >
            + Create New Custom Spell
          </button>
        ) : (
          <div
            style={{
              background: "#f5f3ef",
              border: "2px solid #7D5E4F",
              borderRadius: "12px",
              padding: "20px",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <h3 style={{ color: "#7D5E4F", marginBottom: "10px" }}>Custom Spell Limit Reached</h3>
            <p style={{ marginBottom: "15px", color: "#5a5a5a" }}>
              You've created {canCreate.current} of {canCreate.limit} free custom spells.
            </p>
            <button
              onClick={() => navigate("/subscribe")}
              style={{
                padding: "12px 24px",
                background: "#7D5E4F",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Upgrade to Premium for Unlimited Custom Spells
            </button>
          </div>
        )}
      </div>

      {/* Spells Grid */}
      {customSpells.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          <p style={{ fontSize: "18px", marginBottom: "10px" }}>You haven't created any custom spells yet.</p>
          <p>Click the button above to create your first custom spell!</p>
        </div>
      ) : (
        <div className="spell-grid" style={{ padding: "20px" }}>
          {customSpells.map((spell) => (
            <div key={spell.id} className="spell-card" style={{ position: "relative" }}>
              {spell.image_url && (
                <img
                  src={spell.image_url}
                  alt={spell.title}
                  className="spell-image"
                  style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px 8px 0 0" }}
                />
              )}
              <div style={{ padding: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span
                    style={{
                      background: "#7D5E4F",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Custom
                  </span>
                  <span className="spell-category" style={{ fontSize: "13px" }}>
                    {spell.category}
                  </span>
                </div>
                <h3 className="spell-title" style={{ fontSize: "18px", marginBottom: "15px", fontWeight: "600" }}>
                  {spell.title}
                </h3>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate(`/spell/${spell.id}`)}
                    style={{
                      flex: "1",
                      padding: "8px 12px",
                      background: "#7D5E4F",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/custom-spells/edit/${spell.id}`)}
                    style={{
                      flex: "1",
                      padding: "8px 12px",
                      background: "#6a9fb5",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(spell.id)}
                    style={{
                      flex: "1",
                      padding: "8px 12px",
                      background: "#c74545",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "400px",
              margin: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "15px", color: "#7D5E4F" }}>Delete Custom Spell?</h3>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              Are you sure you want to delete this custom spell? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: "1",
                  padding: "10px",
                  background: "#e0e0e0",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: "1",
                  padding: "10px",
                  background: "#c74545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
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
