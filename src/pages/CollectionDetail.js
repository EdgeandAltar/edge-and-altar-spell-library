import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  getCollectionById,
  getCollectionSpells,
  removeSpellFromCollection,
  updateCollection,
} from "../collectionsService";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";
import { HiOutlineX } from "react-icons/hi";
import "./CollectionDetail.css";

function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [spells, setSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [toast, setToast] = useState(null);

  // Inline edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);

      const [col, colSpells] = await Promise.all([
        getCollectionById(id, user.id),
        getCollectionSpells(id),
      ]);

      if (!col) {
        navigate("/collections");
        return;
      }

      setCollection(col);
      setSpells(colSpells);
      setEditName(col.name);
    } catch (err) {
      console.error("[CollectionDetail] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSpell = async (spellId) => {
    const success = await removeSpellFromCollection(id, spellId);
    if (success) {
      setSpells((prev) => prev.filter((s) => s.id !== spellId));
      setCollection((prev) => (prev ? { ...prev, spellCount: prev.spellCount - 1 } : prev));
      setToast({ message: "Spell removed from collection.", type: "success" });
    } else {
      setToast({ message: "Failed to remove spell.", type: "error" });
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || !userId || !collection) return;
    const success = await updateCollection(collection.id, userId, { name: editName });
    if (success) {
      setCollection((prev) => (prev ? { ...prev, name: editName.trim() } : prev));
      setToast({ message: "Collection name updated!", type: "success" });
    } else {
      setToast({ message: "Failed to update name.", type: "error" });
    }
    setEditing(false);
  };

  if (loading) return <LoadingSpinner text="Loading collection..." />;
  if (!collection) return null;

  return (
    <div className="collection-detail-container">
      <button className="back-button" onClick={() => navigate("/collections")} type="button">
        &larr; Back to My Collections
      </button>

      <div className="collection-detail-header">
        {editing ? (
          <div className="inline-edit">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 50))}
              className="inline-edit-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditName(collection.name);
                }
              }}
            />
            <button className="inline-edit-save" onClick={handleSaveName} type="button">
              Save
            </button>
            <button
              className="inline-edit-cancel"
              onClick={() => {
                setEditing(false);
                setEditName(collection.name);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1 onClick={() => setEditing(true)} className="editable-title" title="Click to edit">
            {collection.name}
          </h1>
        )}
        <p className="spell-count-label">
          {spells.length} spell{spells.length === 1 ? "" : "s"}
        </p>
      </div>

      {spells.length === 0 ? (
        <div className="empty-collection-detail">
          <div className="empty-icon">📭</div>
          <h2>This collection is empty</h2>
          <p>Add spells from the library or your favorites.</p>
          <button
            className="browse-spells-btn"
            onClick={() => navigate("/library")}
            type="button"
          >
            Browse Spells
          </button>
        </div>
      ) : (
        <div className="spell-grid">
          {spells.map((spell) => (
            <div
              key={spell.id}
              className="spell-card"
              onClick={() => navigate(`/spell/${spell.id}`)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <button
                className="remove-from-collection-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSpell(spell.id);
                }}
                aria-label="Remove from collection"
                title="Remove from collection"
                type="button"
              >
                <HiOutlineX />
              </button>

              {spell.imageUrl && (
                <img src={spell.imageUrl} alt={spell.title} className="spell-image" />
              )}

              <div className="spell-content">
                <div className="spell-badges">
                  {spell.isCustom && (
                    <span
                      className="custom-badge"
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
                  )}
                  {spell.isPremium && <span className="premium-badge">Premium</span>}
                  <span className="time-badge">{spell.timeRequired}</span>
                </div>

                <h3>{spell.title}</h3>

                <div className="spell-meta">
                  <span className="category">{spell.category}</span>
                  <span className="skill">{spell.skillLevel}</span>
                </div>

                <p className="spell-description">{spell.whenToUse}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default CollectionDetail;
