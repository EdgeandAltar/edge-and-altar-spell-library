import LoadingSpinner from "../components/LoadingSpinner";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineHeart, HiHeart, HiLockClosed } from "react-icons/hi";
import "./SpellLibrary.css";
import MoonPhaseWidget from "../components/MoonPhaseWidget";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function SpellLibrary() {
  const [spells, setSpells] = useState([]);
  const [filteredSpells, setFilteredSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  const [userSubscription, setUserSubscription] = useState("free");
  const [favorites, setFavorites] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

  const FEATURED_ORDER = useMemo(
    () => [
      "The 'I'm Spiraling' Interrupt Knot",
      "Burnout Recovery Sigil",
      "Mirror Shield Visualization",
      "Permission to Create Badly Ritual",
      "The Starting Line Ritual",
      "New Job Transition Blessing",
      "Nightmare Shield Before Sleep",
      "Grief Metabolism Ritual",
      "Job Interview Confidence Armor",
      "Digital Boundary Ritual",
    ],
    []
  );

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

  const tagOptions = [
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
    "No Supplies Needed",
    "Kitchen Items Only",
    "Candles Required",
    "Bath/Water Access",
    "Paper & Pen",
    "Household Items",
  ];

  const isDefaultView = () =>
    !searchTerm && !selectedCategory && !selectedTime && !selectedSkill && !selectedSeason && !selectedTag;

  const sortWithFeaturedFirst = (spellsList) => {
    if (!isDefaultView()) return spellsList;

    const orderMap = new Map(FEATURED_ORDER.map((title, idx) => [title, idx]));
    return [...spellsList].sort((a, b) => {
      const aIdx = orderMap.has(a.title) ? orderMap.get(a.title) : Infinity;
      const bIdx = orderMap.has(b.title) ? orderMap.get(b.title) : Infinity;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return 0;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedTime("");
    setSelectedSkill("");
    setSelectedSeason("");
    setSelectedTag("");
  };

  const isFavorited = (spellId) => favorites.includes(String(spellId));

  const handleSpellClick = (spell) => {
    if (spell.isPremium && userSubscription === "free") {
      navigate("/subscribe");
    } else {
      navigate(`/spell/${spell.id}`);
    }
  };

  // ---------- Direct fetch helpers ----------

  const fetchSpellsDirect = async (token) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/spells?select=id,title,when_to_use,category,time_required,skill_level,seasonal_tags,tags,is_premium,image_url,created_at,legacy_id&order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch spells: ${response.status}`);
    }

    const data = await response.json();

    return (data || []).map((s) => ({
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
    }));
  };

  const fetchAccessLevelDirect = async (token, uid) => {
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
        console.warn("[SpellLibrary] profiles fetch failed:", response.status);
        return "free";
      }

      const data = await response.json();
      return data?.[0]?.access_level === "premium" ? "premium" : "free";
    } catch (err) {
      console.warn("[SpellLibrary] fetchAccessLevel error:", err);
      return "free";
    }
  };

  const fetchFavoritesDirect = async (token, uid) => {
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
        console.warn("[SpellLibrary] favorites fetch failed:", response.status);
        return [];
      }

      const data = await response.json();
      return (data || []).map((row) => String(row.spell_id));
    } catch (err) {
      console.warn("[SpellLibrary] fetchFavorites error:", err);
      return [];
    }
  };

  const toggleFavorite = async (spellId, e) => {
    e.stopPropagation();

    if (!accessToken || !userId) {
      navigate("/login");
      return;
    }

    const sid = String(spellId);
    const currentlyFavorited = favorites.includes(sid);

    try {
      if (currentlyFavorited) {
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
      }
    } catch (err) {
      console.error("[favorites] toggle error:", err);
    }
  };

  // ---------- Get auth token on mount ----------

  useEffect(() => {
    const getTokenFromStorage = () => {
      try {
        const storageKey = Object.keys(localStorage).find(
          (k) => k.includes("sb-") && k.includes("-auth-token")
        );
        
        if (!storageKey) {
          setAccessToken(null);
          setUserId(null);
          return;
        }

        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          setAccessToken(null);
          setUserId(null);
          return;
        }

        const parsed = JSON.parse(raw);
        const token = parsed?.access_token;
        const uid = parsed?.user?.id;

        if (token && uid) {
          setAccessToken(token);
          setUserId(uid);
        } else {
          setAccessToken(null);
          setUserId(null);
        }
      } catch (err) {
        console.warn("[SpellLibrary] Failed to get session from storage:", err);
        setAccessToken(null);
        setUserId(null);
      }
    };

    getTokenFromStorage();
  }, []);

  // ---------- Load data when token is available ----------

  useEffect(() => {
    if (!accessToken || !userId) {
      return;
    }

    let alive = true;

    const load = async () => {
      setLoading(true);
      setPageError("");

      try {
        const spellsData = await fetchSpellsDirect(accessToken);
        if (!alive) return;

        setSpells(spellsData);

        const [level, favs] = await Promise.all([
          fetchAccessLevelDirect(accessToken, userId),
          fetchFavoritesDirect(accessToken, userId),
        ]);

        if (!alive) return;

        setUserSubscription(level);
        setFavorites(favs);
      } catch (err) {
        console.error("[SpellLibrary] load error:", err);
        if (!alive) return;
        setPageError(err?.message || "Failed to load spells.");
        setSpells([]);
        setFilteredSpells([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [accessToken, userId]);

  // ---------- Filter ----------
  useEffect(() => {
    let filtered = [...spells];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((spell) => {
        const title = (spell.title || "").toLowerCase();
        const when = (spell.whenToUse || "").toLowerCase();
        const tagsText = (spell.tags || []).join(" ").toLowerCase();
        return title.includes(term) || when.includes(term) || tagsText.includes(term);
      });
    }

    if (selectedCategory) filtered = filtered.filter((spell) => spell.category === selectedCategory);
    if (selectedTime) filtered = filtered.filter((spell) => spell.timeRequired === selectedTime);
    if (selectedSkill) filtered = filtered.filter((spell) => spell.skillLevel === selectedSkill);

    if (selectedSeason) {
      filtered = filtered.filter((spell) => (spell.seasonalTags || []).includes(selectedSeason));
    }

    if (selectedTag) {
      filtered = filtered.filter((spell) => (spell.tags || []).includes(selectedTag));
    }

    filtered = sortWithFeaturedFirst(filtered);

    setFilteredSpells(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    spells,
    searchTerm,
    selectedCategory,
    selectedTime,
    selectedSkill,
    selectedSeason,
    selectedTag,
    userSubscription,
  ]);

  if (loading) return <LoadingSpinner text="Loading spells..." />;

  return (
    <div className="library-container">
      <div className="library-hero">
        <div className="hero-image-container">
          <img
            src="/images/library-hero.png"
            alt="Spell book and ritual ingredients"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="library-header">
          <h1>Spell Library</h1>
          <p className="subtitle">Browse and discover {filteredSpells.length} spells</p>

          {userSubscription === "free" && (
            <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "14px", marginTop: "8px" }}>
              You're viewing {filteredSpells.filter((s) => !s.isPremium).length} free spells.{" "}
              <button
                onClick={() => navigate("/subscribe")}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Upgrade to Premium
              </button>{" "}
              to unlock {filteredSpells.filter((s) => s.isPremium).length} premium spells!
            </p>
          )}
        </div>
      </div>

      <MoonPhaseWidget />

      <div className="filters-section">
        <input
          type="text"
          className="search-bar"
          placeholder="Search spells..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="filter-row">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
            <option value="">Any Time</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

          <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
            <option value="">All Levels</option>
            {skillLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            <option value="">All Seasons</option>
            {seasonalOptions.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>

          <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
            <option value="">All Tags</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          {(searchTerm || selectedCategory || selectedTime || selectedSkill || selectedSeason || selectedTag) && (
            <button className="clear-filters" onClick={clearFilters} type="button">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {pageError ? (
        <div className="no-results">
          <p style={{ marginBottom: 10 }}>Couldn't load spells.</p>
          <p style={{ fontSize: 13, opacity: 0.8 }}>{pageError}</p>
        </div>
      ) : filteredSpells.length === 0 ? (
        <div className="no-results">
          <p>No spells found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="spell-grid">
          {filteredSpells.map((spell) => {
            const isPremiumLocked = spell.isPremium && userSubscription === "free";

            return (
              <div
                key={spell.id}
                className={`spell-card ${isPremiumLocked ? "premium-locked" : ""}`}
                onClick={() => handleSpellClick(spell)}
                style={{ cursor: "pointer", position: "relative" }}
              >
                {isPremiumLocked && (
                  <div className="lock-overlay">
                    <HiLockClosed className="lock-icon" />
                    <span className="lock-text">Premium</span>
                  </div>
                )}

                <button
                  className="favorite-btn"
                  onClick={(e) => toggleFavorite(spell.id, e)}
                  aria-label={isFavorited(spell.id) ? "Remove from favorites" : "Add to favorites"}
                  type="button"
                >
                  {isFavorited(spell.id) ? (
                    <HiHeart className="heart-icon filled" />
                  ) : (
                    <HiOutlineHeart className="heart-icon" />
                  )}
                </button>

                {spell.imageUrl && (
                  <img
                    src={spell.imageUrl}
                    alt={spell.title}
                    className="spell-image"
                    style={{
                      filter: isPremiumLocked ? "blur(3px) brightness(0.7)" : "none",
                    }}
                  />
                )}

                <div className="spell-content">
                  <div className="spell-badges">
                    {spell.isPremium && <span className="premium-badge">Premium</span>}
                    <span className="time-badge">{spell.timeRequired}</span>
                  </div>

                  <h3 style={{ opacity: isPremiumLocked ? 0.7 : 1 }}>{spell.title}</h3>

                  <div className="spell-meta">
                    <span className="category">{spell.category}</span>
                    <span className="skill">{spell.skillLevel}</span>
                  </div>

                  <p className="spell-description" style={{ opacity: isPremiumLocked ? 0.6 : 1 }}>
                    {spell.whenToUse}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SpellLibrary;