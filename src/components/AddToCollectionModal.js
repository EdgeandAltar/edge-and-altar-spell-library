import React, { useEffect, useState } from "react";
import {
  getUserCollections,
  getCollectionsForSpell,
  addSpellToCollection,
  removeSpellFromCollection,
  createCollection,
} from "../collectionsService";
import { HiOutlineX } from "react-icons/hi";
import "./AddToCollectionModal.css";

function AddToCollectionModal({ spellId, userId, onClose }) {
  const [collections, setCollections] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  // Inline create
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCollections, spellCollectionIds] = await Promise.all([
        getUserCollections(userId),
        getCollectionsForSpell(userId, spellId),
      ]);
      setCollections(allCollections);
      setCheckedIds(new Set(spellCollectionIds));
    } catch (err) {
      console.error("[AddToCollectionModal] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (collectionId) => {
    setTogglingId(collectionId);
    const isChecked = checkedIds.has(collectionId);

    let success;
    if (isChecked) {
      success = await removeSpellFromCollection(collectionId, spellId);
      if (success) {
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, spellCount: c.spellCount - 1 } : c))
        );
      }
    } else {
      success = await addSpellToCollection(collectionId, spellId);
      if (success) {
        setCheckedIds((prev) => new Set(prev).add(collectionId));
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? { ...c, spellCount: c.spellCount + 1 } : c))
        );
      }
    }

    setTogglingId(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateLoading(true);

    const result = await createCollection(userId, newName);

    if (result?.error) {
      alert(result.error);
      setCreateLoading(false);
      return;
    }

    // Add spell to the new collection immediately
    await addSpellToCollection(result.id, spellId);

    setCollections((prev) => [{ ...result, spellCount: 1 }, ...prev]);
    setCheckedIds((prev) => new Set(prev).add(result.id));
    setNewName("");
    setShowCreate(false);
    setCreateLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="atc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="atc-close-btn" onClick={onClose} type="button">
          <HiOutlineX />
        </button>

        <h2 className="atc-title">Add to Collection</h2>

        {loading ? (
          <div className="atc-loading">Loading collections...</div>
        ) : collections.length === 0 && !showCreate ? (
          <div className="atc-empty">
            <p>You haven't created any collections yet. Create your first one to get started.</p>
            <button
              className="atc-create-btn"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              + Create New Collection
            </button>
          </div>
        ) : (
          <>
            <div className="atc-list">
              {collections.map((c) => (
                <label
                  key={c.id}
                  className={`atc-item ${togglingId === c.id ? "toggling" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(c.id)}
                    onChange={() => handleToggle(c.id)}
                    disabled={togglingId !== null}
                  />
                  <span className="atc-item-name">{c.name}</span>
                  <span className="atc-item-count">
                    {c.spellCount} spell{c.spellCount === 1 ? "" : "s"}
                  </span>
                </label>
              ))}
            </div>

            {showCreate ? (
              <div className="atc-create-form">
                <input
                  type="text"
                  className="atc-create-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 50))}
                  placeholder="Collection name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                />
                <button
                  className="atc-create-confirm"
                  onClick={handleCreate}
                  disabled={!newName.trim() || createLoading}
                  type="button"
                >
                  {createLoading ? "..." : "Create & Add"}
                </button>
                <button
                  className="atc-create-cancel"
                  onClick={() => setShowCreate(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="atc-create-btn"
                onClick={() => setShowCreate(true)}
                type="button"
              >
                + Create New Collection
              </button>
            )}
          </>
        )}

        <button className="atc-done-btn" onClick={onClose} type="button">
          Done
        </button>
      </div>
    </div>
  );
}

export default AddToCollectionModal;
