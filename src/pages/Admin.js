import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "./Admin.css";

// ✅ slug helper for SEO-friendly URLs
const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Upload image to Supabase Storage (bucket: spell-images)
async function uploadSpellImage(file) {
  const ext = file.name.split(".").pop() || "png";
  const path = `spell-images/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("spell-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from("spell-images").getPublicUrl(path);
  return data.publicUrl;
}

// Map formData (camelCase) -> DB columns (snake_case)
function toDbPayload(formData, imageUrl) {
  const safeSeasonal = Array.isArray(formData.seasonalTags) ? formData.seasonalTags : [];
  const safeTags = Array.isArray(formData.tags) ? formData.tags : [];

  return {
    title: formData.title?.trim() || "",
    slug: slugify(formData.title || ""),
    category: formData.category || "",
    time_required: formData.timeRequired || "",
    skill_level: formData.skillLevel || "",
    when_to_use: formData.whenToUse || "",
    ingredients: formData.ingredients || "",
    instructions: formData.instructions || "",
    why_this_works: formData.whyThisWorks || "",
    spoken_intention: formData.spokenIntention || "",
    tips: formData.tips || "",
    vibe: formData.vibe || "",
    supplies_needed: formData.suppliesNeeded || "",
    seasonal_tags: safeSeasonal,
    tags: safeTags,
    is_premium: Boolean(formData.isPremium),
    image_url: imageUrl || null,
    // created_at can default in DB; safe to include or omit
    created_at: new Date().toISOString(),
  };
}

function Admin() {
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
    isPremium: false,
    vibe: "",
    suppliesNeeded: "",
    seasonalTags: [],
    tags: [],
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const categories = [
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
  ];

  const timeOptions = ["Under 5 min", "5-15 min", "15-30 min", "30-60 min", "60+ min"];
  const skillLevels = ["Beginner", "Intermediate", "Advanced", "Ceremonial"];

  const vibes = [
    "Practical/No-Nonsense",
    "Witchy/Aesthetic",
    "Powerful/Intense",
    "Soft/Gentle",
    "Ceremonial/Formal",
  ];

  const seasonalOptions = [
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
  ];

  const suppliesOptions = [
    "No supplies needed",
    "Kitchen items only",
    "Candles required",
    "Altar setup needed",
    "Outdoor space required",
    "Bath/water access",
  ];

  const intentTags = [
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
  ];

  const situationTags = [
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
  ];

  const supplyTags = [
    "No Supplies Needed",
    "Kitchen Items Only",
    "Candles Required",
    "Bath/Water Access",
    "Paper & Pen",
    "Household Items",
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files?.[0]) setImage(e.target.files[0]);
  };

  const toggleTag = (tagValue) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.tags) ? prev.tags : [];
      const next = current.includes(tagValue) ? current.filter((t) => t !== tagValue) : [...current, tagValue];
      return { ...prev, tags: next };
    });
  };

  const toggleSeasonal = (season) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.seasonalTags) ? prev.seasonalTags : [];
      const next = current.includes(season) ? current.filter((t) => t !== season) : [...current, season];
      return { ...prev, seasonalTags: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // ✅ auth check (your RLS should enforce admin access)
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("You must be signed in to add spells.");

      let imageUrl = "";
      if (image) imageUrl = await uploadSpellImage(image);

      const payload = toDbPayload(formData, imageUrl);

      const { error: insertErr } = await supabase.from("spells").insert(payload);
      if (insertErr) throw insertErr;

      setSuccess("Spell added successfully!");
      setTimeout(() => setSuccess(""), 3000);

      setFormData({
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
        isPremium: false,
        vibe: "",
        suppliesNeeded: "",
        seasonalTags: [],
        tags: [],
      });

      setImage(null);
    } catch (err) {
      console.error("[Admin] error:", err);
      setError("Error adding spell: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const renderTagSection = (title, tagsArray) => (
    <div style={{ marginBottom: "12px" }}>
      <h4 style={{ fontSize: "14px", color: "#7D5E4F", marginBottom: "8px", fontWeight: "600" }}>
        {title}
      </h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "#f5f3ef", borderRadius: "8px" }}>
        {tagsArray.map((tag) => (
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
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Add New Spell</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Spell Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="e.g., Morning Protection Coffee Spell" />
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
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
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
              {skillLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "#f5f3ef", borderRadius: "8px" }}>
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
                <input type="checkbox" value={season} checked={(formData.seasonalTags || []).includes(season)} onChange={() => toggleSeasonal(season)} style={{ margin: 0 }} />
                {season}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Tags (select all that apply)</label>
          <div style={{ marginBottom: "16px" }}>
            {renderTagSection("Intent", intentTags)}
            {renderTagSection("Situation", situationTags)}
            {renderTagSection("Supplies", supplyTags)}
          </div>
        </div>

        <div className="form-group">
          <label>When to Use *</label>
          <textarea name="whenToUse" value={formData.whenToUse} onChange={handleInputChange} required rows="2" />
        </div>

        <div className="form-group">
          <label>Ingredients *</label>
          <textarea name="ingredients" value={formData.ingredients} onChange={handleInputChange} required rows="4" />
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <textarea name="instructions" value={formData.instructions} onChange={handleInputChange} required rows="6" />
        </div>

        <div className="form-group">
          <label>Why This Works</label>
          <textarea name="whyThisWorks" value={formData.whyThisWorks} onChange={handleInputChange} rows="4" />
        </div>

        <div className="form-group">
          <label>Spoken Intention</label>
          <textarea name="spokenIntention" value={formData.spokenIntention} onChange={handleInputChange} rows="3" />
        </div>

        <div className="form-group">
          <label>Tips & Modifications</label>
          <textarea name="tips" value={formData.tips} onChange={handleInputChange} rows="3" />
        </div>

        <div className="form-group">
          <label>Spell Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {image && <p className="file-name">Selected: {image.name}</p>}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" name="isPremium" checked={formData.isPremium} onChange={handleInputChange} />
            Premium Spell (requires subscription)
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? "Adding Spell..." : "Add Spell"}
        </button>
      </form>
    </div>
  );
}

export default Admin;
