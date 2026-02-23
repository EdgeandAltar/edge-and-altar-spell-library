import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  getUserCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getUserCollectionCount,
} from "../collectionsService";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";
import {
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineBookOpen,
  HiOutlineSparkles,
  HiOutlineLightningBolt,
  HiOutlineColorSwatch,
  HiOutlineFolder,
} from "react-icons/hi";
import "./MyCollections.css";

const MAX_COLLECTIONS = 15;

function MyCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [toast, setToast] = useState(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editCollection, setEditCollection] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
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
      const data = await getUserCollections(user.id);
      setCollections(data);
    } catch (err) {
      console.error("[MyCollections] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim() || !userId) return;
    setCreateLoading(true);

    const result = await createCollection(userId, createName, createDescription);

    if (result?.error) {
      setToast({ message: result.error, type: "error" });
      setCreateLoading(false);
      return;
    }

    setCollections((prev) => [result, ...prev]);
    setShowCreateModal(false);
    setCreateName("");
    setCreateDescription("");
    setCreateLoading(false);
    setToast({ message: "Collection created!", type: "success" });
  };

  const handleEdit = async () => {
    if (!editName.trim() || !editCollection || !userId) return;
    setEditLoading(true);

    const success = await updateCollection(editCollection.id, userId, {
      name: editName,
      description: editDescription,
    });

    if (success) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === editCollection.id
            ? { ...c, name: editName.trim(), description: editDescription?.trim() || null }
            : c
        )
      );
      setToast({ message: "Collection updated!", type: "success" });
    } else {
      setToast({ message: "Failed to update collection.", type: "error" });
    }

    setEditCollection(null);
    setEditLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !userId) return;

    const success = await deleteCollection(deleteTarget.id, userId);

    if (success) {
      setCollections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setToast({ message: "Collection deleted.", type: "success" });
    } else {
      setToast({ message: "Failed to delete collection.", type: "error" });
    }

    setDeleteTarget(null);
  };

  const openCreateModal = async () => {
    if (!userId) return;
    const count = await getUserCollectionCount(userId);
    if (count >= MAX_COLLECTIONS) {
      setToast({
        message: `You can create up to ${MAX_COLLECTIONS} collections.`,
        type: "error",
      });
      return;
    }
    setCreateName("");
    setCreateDescription("");
    setShowCreateModal(true);
  };

  const openEditModal = (collection, e) => {
    e.stopPropagation();
    setEditCollection(collection);
    setEditName(collection.name);
    setEditDescription(collection.description || "");
  };

  if (loading) return <LoadingSpinner text="Loading your collections..." />;

  const hasCollections = collections.length > 0;

  return (
    <div className="collections-page">
      {/* Hero Section */}
      <div className="collections-hero">
        <div className="collections-hero-image-container">
          <img
            src="/images/actual-collections-hero.png"
            alt="Your Collections"
            className="collections-hero-image"
          />
          <div className="collections-hero-overlay"></div>
        </div>
        <div className="collections-hero-content">
          <h1 className="collections-hero-title">Your Collections</h1>
          <p className="collections-hero-subtitle">
            Create custom collections to organize spells by intention, time of day, season, or
            however makes sense to you
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="collections-content">
        {hasCollections ? (
          <>
            {/* Has Collections State */}
            <div className="collections-top-bar">
              <p className="collections-count">
                {collections.length} collection{collections.length === 1 ? "" : "s"}
              </p>
              <button className="create-collection-btn" onClick={openCreateModal} type="button">
                <HiOutlinePlus className="btn-icon" /> Create New Collection
              </button>
            </div>

            <div className="collections-grid">
              {collections.map((collection) => {
                const isEmpty = !collection.spellCount || collection.spellCount === 0;
                return (
                  <div
                    key={collection.id}
                    className={`collection-card ${isEmpty ? "collection-card--empty" : ""}`}
                    onClick={() => navigate(`/collections/${collection.id}`)}
                  >
                    <div className="collection-card-body">
                      <h3 className="collection-name">{collection.name}</h3>
                      {collection.description && (
                        <p className="collection-description">{collection.description}</p>
                      )}
                      <div className="collection-spell-count">
                        <span className="spell-count-icon">{isEmpty ? <HiOutlineBookOpen /> : <HiOutlineSparkles />}</span>
                        <span>
                          {collection.spellCount} spell{collection.spellCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {isEmpty ? (
                        <p className="collection-empty-hint">
                          Empty collection — ready to add spells
                        </p>
                      ) : (
                        collection.spellNames &&
                        collection.spellNames.length > 0 && (
                          <div className="collection-spell-preview">
                            {collection.spellNames.slice(0, 3).map((name, i) => (
                              <span key={i} className="spell-preview-tag">
                                {name}
                              </span>
                            ))}
                            {collection.spellNames.length > 3 && (
                              <span className="spell-preview-more">
                                +{collection.spellNames.length - 3} more
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                    <div className="collection-card-actions">
                      <button
                        className="collection-edit-btn"
                        onClick={(e) => openEditModal(collection, e)}
                        type="button"
                      >
                        <HiOutlinePencilAlt className="action-icon" /> Edit
                      </button>
                      <button
                        className="collection-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(collection);
                        }}
                        type="button"
                      >
                        <HiOutlineTrash className="action-icon" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Empty State */}
            <div className="collections-feature-cards">
              <div className="feature-card">
                <div className="feature-card-icon"><HiOutlineColorSwatch /></div>
                <h3 className="feature-card-title">Organize by Intention</h3>
                <p className="feature-card-text">
                  Group spells by what you're working on: Morning Rituals, Emergency Spells, Full
                  Moon Magic, or whatever makes sense for you.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon"><HiOutlineLightningBolt /></div>
                <h3 className="feature-card-title">Quick Access</h3>
                <p className="feature-card-text">
                  Find the right spell faster. Instead of browsing 220+ spells, go straight to your
                  curated collection for the moment.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon"><HiOutlineFolder /></div>
                <h3 className="feature-card-title">Your System, Your Way</h3>
                <p className="feature-card-text">
                  Create as many collections as you need. A spell can be in multiple collections.
                  Organize however works for your brain.
                </p>
              </div>
            </div>

            <div className="collections-empty-message">
              <p>You haven't created any collections yet. When you do, they'll appear here.</p>
              <button className="create-collection-btn" onClick={openCreateModal} type="button">
                <HiOutlinePlus className="btn-icon" /> Create Your First Collection
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Collection</h2>
            <label className="modal-label">
              Collection Name *
              <input
                type="text"
                className="modal-input"
                value={createName}
                onChange={(e) => setCreateName(e.target.value.slice(0, 50))}
                placeholder="e.g., Morning Rituals, Emergency Spells, Full Moon Magic"
                autoFocus
              />
              <span className="char-count">{createName.length}/50</span>
            </label>
            <label className="modal-label">
              Description (optional)
              <textarea
                className="modal-textarea"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value.slice(0, 200))}
                placeholder="What's this collection for?"
                rows={3}
              />
              <span className="char-count">{createDescription.length}/200</span>
            </label>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setShowCreateModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="modal-confirm-btn"
                onClick={handleCreate}
                disabled={!createName.trim() || createLoading}
                type="button"
              >
                {createLoading ? "Creating..." : "Create Collection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editCollection && (
        <div className="modal-overlay" onClick={() => setEditCollection(null)}>
          <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Collection</h2>
            <label className="modal-label">
              Collection Name *
              <input
                type="text"
                className="modal-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, 50))}
                autoFocus
              />
              <span className="char-count">{editName.length}/50</span>
            </label>
            <label className="modal-label">
              Description (optional)
              <textarea
                className="modal-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value.slice(0, 200))}
                placeholder="What's this collection for?"
                rows={3}
              />
              <span className="char-count">{editDescription.length}/200</span>
            </label>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setEditCollection(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="modal-confirm-btn"
                onClick={handleEdit}
                disabled={!editName.trim() || editLoading}
                type="button"
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="collection-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#7D5E4F", marginBottom: "15px" }}>
              Delete "{deleteTarget.name}"?
            </h3>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              This won't delete the spells themselves, just this collection.
            </p>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button className="modal-delete-btn" onClick={handleDelete} type="button">
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default MyCollections;
