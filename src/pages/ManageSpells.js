import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./ManageSpells.css";

function ManageSpells() {
  const [spells, setSpells] = useState([]);
  const [filteredSpells, setFilteredSpells] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const navigate = useNavigate();

  const mapRowToSpell = (row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    timeRequired: row.time_required,
    skillLevel: row.skill_level,
    whenToUse: row.when_to_use,
    seasonalTags: Array.isArray(row.seasonal_tags) ? row.seasonal_tags : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPremium: Boolean(row.is_premium),
    imageUrl: row.image_url || "",
    createdAt: row.created_at,
  });

  const fetchSpells = async () => {
    try {
      setLoading(true);

      // Optional auth check (RLS should enforce admin permissions anyway)
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        setSpells([]);
        setFilteredSpells([]);
        return;
      }

      const { data, error } = await supabase
        .from("spells")
        .select(
          [
            "id",
            "title",
            "category",
            "time_required",
            "skill_level",
            "when_to_use",
            "seasonal_tags",
            "tags",
            "is_premium",
            "image_url",
            "created_at",
          ].join(",")
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const spellsData = (data || []).map(mapRowToSpell);
      setSpells(spellsData);
      setFilteredSpells(spellsData);
    } catch (err) {
      console.error("Error fetching spells:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      setFilteredSpells(spells);
      return;
    }

    const filtered = spells.filter((spell) => {
      const title = (spell.title || "").toLowerCase();
      const category = (spell.category || "").toLowerCase();
      const tagsText = (spell.tags || []).join(" ").toLowerCase();
      const seasonalText = (spell.seasonalTags || []).join(" ").toLowerCase();

      return (
        title.includes(term) ||
        category.includes(term) ||
        tagsText.includes(term) ||
        seasonalText.includes(term)
      );
    });

    setFilteredSpells(filtered);
  }, [searchTerm, spells]);

  const premiumCount = useMemo(() => spells.filter((s) => s.isPremium).length, [spells]);
  const freeCount = useMemo(() => spells.filter((s) => !s.isPremium).length, [spells]);

  const handleDelete = async (spellId) => {
    try {
      const { error } = await supabase.from("spells").delete().eq("id", spellId);
      if (error) throw error;

      setSpells((prev) => prev.filter((s) => s.id !== spellId));
      setDeleteConfirm(null);
      alert("Spell deleted successfully!");
    } catch (err) {
      console.error("Error deleting spell:", err);
      alert("Error deleting spell. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading spells...</div>;
  }

  return (
    <div className="manage-container">
      <div className="manage-header">
        <h1>Manage Spells</h1>
        <p className="subtitle">
          Total: {spells.length} spells ({premiumCount} premium, {freeCount} free)
        </p>
      </div>

      <div className="manage-actions">
        <input
          type="text"
          className="search-bar"
          placeholder="Search spells by title, category, tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="add-new-btn" onClick={() => navigate("/admin")} type="button">
          + Add New Spell
        </button>
      </div>

      {filteredSpells.length === 0 ? (
        <div className="no-results">
          <p>No spells found.</p>
        </div>
      ) : (
        <div className="spells-table">
          {filteredSpells.map((spell) => (
            <div key={spell.id} className="spell-row">
              <div className="spell-info">
                {spell.imageUrl && (
                  <img src={spell.imageUrl} alt={spell.title} className="spell-thumbnail" />
                )}
                <div className="spell-details">
                  <h3>{spell.title}</h3>
                  <div className="spell-meta">
                    <span className="badge">{spell.category}</span>
                    <span className="badge">{spell.timeRequired}</span>
                    <span className="badge">{spell.skillLevel}</span>
                    {spell.isPremium && <span className="badge premium">Premium</span>}
                  </div>
                </div>
              </div>

              <div className="spell-actions">
                <button
                  className="edit-btn"
                  onClick={() => navigate(`/edit-spell/${spell.id}`)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="view-btn"
                  onClick={() => navigate(`/spell/${spell.id}`)}
                  type="button"
                >
                  View
                </button>
                <button
                  className="delete-btn"
                  onClick={() => setDeleteConfirm(spell.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>

              {deleteConfirm === spell.id && (
                <div className="delete-confirm">
                  <p>Are you sure you want to delete "{spell.title}"?</p>
                  <div className="confirm-actions">
                    <button
                      className="confirm-yes"
                      onClick={() => handleDelete(spell.id)}
                      type="button"
                    >
                      Yes, Delete
                    </button>
                    <button
                      className="confirm-no"
                      onClick={() => setDeleteConfirm(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageSpells;
