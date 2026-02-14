import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { createCustomSpell, updateCustomSpell } from "../services/customSpellsService";
import "../pages/Admin.css"; // reuse admin styles

// Slug helper (same behavior as EditSpell)
const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function uploadSpellImage(file) {
  const ext = file.name.split(".").pop() || "png";
  const path = `spells/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("spell-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from("spell-images").getPublicUrl(path);
  return data.publicUrl;
}

function CustomSpellForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template;

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  const [image, setImage] = useState(null);

  // UI state uses camelCase
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    timeRequired: "",
    skillLevel: "",
    whenToUse: "",
    ingredients: "",
    instructions: "",
    whyThisWorks: "",
    spokenIntention: "",
    tips: "",
    vibe: "",
    suppliesNeeded: "",
    imageUrl: "",
    seasonalTags: [],
    tags: [],
  });

  const categories = useMemo(
    () => [
      "Protection",
      "Money/Abundance",
      "Grounding",
      "Love/Self-Love",
      "Clarity/Focus",
      "Energy/Motivation",
      "Boundaries",
      "Cleansing/Release",
      "Moon Magic",
      "Drink Spells",
      "Candle Spells",
      "Kitchen Magic",
      "Bath/Water Magic",
      "Shadow Work",
    ],
    []
  );

  const timeOptions = useMemo(
    () => ["Under 5 min", "5-15 min", "15-30 min", "30-60 min", "60+ min"],
    []
  );

  const skillLevels = useMemo(
    () => ["Beginner", "Intermediate", "Advanced", "Ceremonial"],
    []
  );

  const vibes = useMemo(
    () => [
      "Practical/No-Nonsense",
      "Witchy/Aesthetic",
      "Powerful/Intense",
      "Soft/Gentle",
      "Ceremonial/Formal",
    ],
    []
  );

  const seasonalOptions = useMemo(
    () => [
      "Any Time",
      "Imbolc (Feb 1-2)",
      "Spring Equinox (March 20)",
      "Beltane (May 1)",
      "Summer Solstice (June 21)",
      "Lammas (Aug 1)",
      "Fall Equinox (Sept 22)",
      "Samhain (Oct 31)",
      "Winter Solstice (Dec 21)",
      "Full Moon",
      "New Moon",
      "Dark Moon",
    ],
    []
  );

  const suppliesOptions = useMemo(
    () => [
      "No supplies needed",
      "Kitchen items only",
      "Candles required",
      "Altar setup needed",
      "Outdoor space required",
      "Bath/water access",
    ],
    []
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to manage custom spells.");
        navigate("/login");
        return;
      }
      setUserId(user.id);

      // If editing mode, fetch the spell
      if (mode === "edit" && id) {
        await fetchSpell(user.id);
      }
      // If create mode with template, pre-fill from template
      else if (mode === "create" && template) {
        setFormData({
          title: template.title ? `${template.title} (My Version)` : "",
          category: template.category || "",
          timeRequired: template.timeRequired || template.time_required || "",
          skillLevel: template.skillLevel || template.skill_level || "",
          whenToUse: template.whenToUse || template.when_to_use || "",
          ingredients: template.ingredients || "",
          instructions: template.instructions || "",
          whyThisWorks: template.whyThisWorks || template.why_this_works || "",
          spokenIntention: template.spokenIntention || template.spoken_intention || "",
          tips: template.tips || "",
          vibe: template.vibe || "",
          suppliesNeeded: template.suppliesNeeded || template.supplies_needed || "",
          imageUrl: template.imageUrl || template.image_url || "",
          seasonalTags: Array.isArray(template.seasonalTags || template.seasonal_tags) ? (template.seasonalTags || template.seasonal_tags) : [],
          tags: Array.isArray(template.tags) ? template.tags : [],
        });
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  const fetchSpell = async (uid) => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("spells")
        .select("*")
        .eq("id", id)
        .eq("created_by_user_id", uid)
        .eq("is_custom", true)
        .single();

      if (error) throw error;
      if (!data) {
        setError("Custom spell not found or you don't have permission to edit it");
        setLoading(false);
        return;
      }

      setFormData({
        title: data.title || "",
        category: data.category || "",
        timeRequired: data.time_required || "",
        skillLevel: data.skill_level || "",
        whenToUse: data.when_to_use || "",
        ingredients: data.ingredients || "",
        instructions: data.instructions || "",
        whyThisWorks: data.why_this_works || "",
        spokenIntention: data.spoken_intention || "",
        tips: data.tips || "",
        vibe: data.vibe || "",
        suppliesNeeded: data.supplies_needed || "",
        imageUrl: data.image_url || "",
        seasonalTags: Array.isArray(data.seasonal_tags) ? data.seasonal_tags : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
      });
    } catch (err) {
      console.error("[CustomSpellForm] fetch error:", err);
      setError("Error loading spell: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files?.[0]) setImage(e.target.files[0]);
  };

  const toggleSeasonalTag = (value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.seasonalTags) ? prev.seasonalTags : [];
      const next = current.includes(value) ? current.filter((t) => t !== value) : [...current, value];
      return { ...prev, seasonalTags: next };
    });
  };

  const toggleTag = (value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.tags) ? prev.tags : [];
      const next = current.includes(value) ? current.filter((t) => t !== value) : [...current, value];
      return { ...prev, tags: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !userId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let imageUrl = formData.imageUrl;

      // Upload new image if provided
      if (image) {
        imageUrl = await uploadSpellImage(image);
      }

      const spellData = {
        ...formData,
        imageUrl,
        slug: slugify(formData.title) || null,
      };

      if (mode === "edit") {
        await updateCustomSpell(id, userId, spellData);
        setSuccess("Custom spell updated successfully!");
      } else {
        await createCustomSpell(userId, spellData);
        setSuccess("Custom spell created successfully!");
      }

      setTimeout(() => {
        navigate("/custom-spells");
      }, 1500);
    } catch (err) {
      console.error("[CustomSpellForm] save error:", err);
      setError(err?.message || "Error saving spell");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading spell...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>{mode === "edit" ? "Edit Custom Spell" : "Create Custom Spell"}</h1>
        <button
          onClick={() => navigate("/custom-spells")}
          style={{
            padding: "10px 20px",
            background: "#7d6e57",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            marginTop: "16px",
          }}
          type="button"
        >
          ← Back to My Custom Spells
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Spell Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleInputChange} required>
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Time Required *</label>
            <select name="timeRequired" value={formData.timeRequired} onChange={handleInputChange} required>
              <option value="">Select time</option>
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Skill Level *</label>
            <select name="skillLevel" value={formData.skillLevel} onChange={handleInputChange} required>
              <option value="">Select level</option>
              {skillLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Vibe</label>
            <select name="vibe" value={formData.vibe} onChange={handleInputChange}>
              <option value="">Select vibe</option>
              {vibes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Supplies Needed</label>
          <select name="suppliesNeeded" value={formData.suppliesNeeded} onChange={handleInputChange}>
            <option value="">Select supplies</option>
            {suppliesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Seasonal Tags (select all that apply)</label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              padding: "12px",
              background: "#f5f3ef",
              borderRadius: "8px",
            }}
          >
            {seasonalOptions.map((season) => (
              <label
                key={season}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: (formData.seasonalTags || []).includes(season) ? "#7D5E4F" : "white",
                  color: (formData.seasonalTags || []).includes(season) ? "white" : "#7D5E4F",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="checkbox"
                  value={season}
                  checked={(formData.seasonalTags || []).includes(season)}
                  onChange={() => toggleSeasonalTag(season)}
                  style={{ margin: 0 }}
                />
                {season}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tags (select all that apply)</label>
          <div style={{ marginBottom: "16px" }}>
            {/* Intent Tags */}
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ fontSize: "14px", color: "#7D5E4F", marginBottom: "8px", fontWeight: "600" }}>
                Intent
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "#f5f3ef", borderRadius: "8px" }}>
                {[
                  "Anxiety Relief",
                  "Boundary Setting",
                  "Emotional Cleansing",
                  "Energy Protection",
                  "Stress Release",
                  "Confidence Building",
                  "Letting Go",
                  "Self-Permission",
                  "Guilt Release",
                  "Overwhelm Relief",
                ].map((tag) => (
                  <label
                    key={tag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: (formData.tags || []).includes(tag) ? "#7D5E4F" : "white",
                      color: (formData.tags || []).includes(tag) ? "white" : "#7D5E4F",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      value={tag}
                      checked={(formData.tags || []).includes(tag)}
                      onChange={() => toggleTag(tag)}
                      style={{ margin: 0 }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {/* Situation Tags */}
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ fontSize: "14px", color: "#7D5E4F", marginBottom: "8px", fontWeight: "600" }}>
                Situation
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "#f5f3ef", borderRadius: "8px" }}>
                {[
                  "After Difficult Conversation",
                  "Before Bed",
                  "After Work",
                  "End of Day",
                  "Morning Ritual",
                  "Before Interaction",
                  "Emergency Use",
                  "Daily Practice",
                  "When Stuck",
                  "When Overwhelmed",
                ].map((tag) => (
                  <label
                    key={tag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: (formData.tags || []).includes(tag) ? "#7D5E4F" : "white",
                      color: (formData.tags || []).includes(tag) ? "white" : "#7D5E4F",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      value={tag}
                      checked={(formData.tags || []).includes(tag)}
                      onChange={() => toggleTag(tag)}
                      style={{ margin: 0 }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {/* Supply Tags */}
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ fontSize: "14px", color: "#7D5E4F", marginBottom: "8px", fontWeight: "600" }}>
                Supplies
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "#f5f3ef", borderRadius: "8px" }}>
                {["No Supplies Needed", "Kitchen Items Only", "Candles Required", "Bath/Water Access", "Paper & Pen", "Household Items"].map(
                  (tag) => (
                    <label
                      key={tag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: (formData.tags || []).includes(tag) ? "#7D5E4F" : "white",
                        color: (formData.tags || []).includes(tag) ? "white" : "#7D5E4F",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        value={tag}
                        checked={(formData.tags || []).includes(tag)}
                        onChange={() => toggleTag(tag)}
                        style={{ margin: 0 }}
                      />
                      {tag}
                    </label>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>When to Use *</label>
          <textarea
            name="whenToUse"
            value={formData.whenToUse}
            onChange={handleInputChange}
            required
            rows="2"
            placeholder="When to use this spell (1-2 sentences)..."
          />
        </div>

        <div className="form-group">
          <label>Ingredients *</label>
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="List ingredients (one per line or bullet points)..."
          />
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            required
            rows="6"
            placeholder="Step-by-step instructions..."
          />
        </div>

        <div className="form-group">
          <label>Why This Works</label>
          <textarea
            name="whyThisWorks"
            value={formData.whyThisWorks}
            onChange={handleInputChange}
            rows="4"
            placeholder="Explain the psychology and mechanism behind this spell (2-3 sentences)..."
          />
        </div>

        <div className="form-group">
          <label>Spoken Intention</label>
          <textarea
            name="spokenIntention"
            value={formData.spokenIntention}
            onChange={handleInputChange}
            rows="3"
            placeholder="Words to say during the spell (optional)..."
          />
        </div>

        <div className="form-group">
          <label>Tips & Modifications</label>
          <textarea
            name="tips"
            value={formData.tips}
            onChange={handleInputChange}
            rows="3"
            placeholder="Optional tips, substitutions, or variations..."
          />
        </div>

        <div className="form-group">
          {formData.imageUrl && (
            <>
              <label>Current Image</label>
              <img
                src={formData.imageUrl}
                alt="Current spell"
                style={{
                  width: "200px",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "12px",
                }}
              />
            </>
          )}
          <label>Upload Image (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {image && <p className="file-name">New image selected: {image.name}</p>}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button type="submit" disabled={saving} className="submit-btn">
          {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Custom Spell"}
        </button>
      </form>
    </div>
  );
}

export default CustomSpellForm;
