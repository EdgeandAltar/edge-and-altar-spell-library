import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiHeart } from "react-icons/hi";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Favorites.css";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function Favorites() {
  const [spells, setSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

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
      console.warn("[Favorites] Failed to get session from storage:", err);
      return null;
    }
  };

  const fetchFavoritesWithSpells = async (token, uid) => {
    // First get the favorite spell IDs
    const favResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${uid}&select=spell_id,created_at&order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!favResponse.ok) {
      throw new Error(`Failed to fetch favorites: ${favResponse.status}`);
    }

    const favorites = await favResponse.json();
    if (!favorites || favorites.length === 0) return [];

    // Get the spell IDs
    const spellIds = favorites.map((f) => f.spell_id);

    // Fetch the spells
    const spellsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/spells?id=in.(${spellIds.join(",")})&select=id,title,when_to_use,category,time_required,skill_level,is_premium,image_url,created_at`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!spellsResponse.ok) {
      throw new Error(`Failed to fetch spells: ${spellsResponse.status}`);
    }

    const spellsData = await spellsResponse.json();

    // Create a map for quick lookup and maintain favorites order
    const spellMap = new Map(spellsData.map((s) => [s.id, s]));

    return favorites
      .map((fav) => spellMap.get(fav.spell_id))
      .filter(Boolean)
      .map((s) => ({
        id: s.id,
        title: s.title,
        whenToUse: s.when_to_use,
        category: s.category,
        timeRequired: s.time_required,
        skillLevel: s.skill_level,
        isPremium: Boolean(s.is_premium),
        imageUrl: s.image_url,
        createdAt: s.created_at,
      }));
  };

  const handleUnfavorite = async (spellId, e) => {
    e.stopPropagation();

    if (!accessToken || !userId) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${userId}&spell_id=eq.${spellId}`,
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
        console.error("[Favorites] unfavorite failed:", response.status);
        return;
      }

      setSpells((prev) => prev.filter((s) => s.id !== spellId));
    } catch (err) {
      console.error("[Favorites] unfavorite error:", err);
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
            setSpells([]);
            setLoading(false);
          }
          return;
        }

        if (alive) {
          setAccessToken(session.accessToken);
          setUserId(session.user.id);
        }

        const favSpells = await fetchFavoritesWithSpells(session.accessToken, session.user.id);
        if (!alive) return;

        setSpells(favSpells);
      } catch (err) {
        console.error("[Favorites] load error:", err);
        if (!alive) return;
        setPageError(err?.message || "Failed to load favorites.");
        setSpells([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <LoadingSpinner text="Loading your favorites..." />;

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h1>My Favorites</h1>
        <p className="subtitle">
          {spells.length === 0
            ? "No favorites yet"
            : `${spells.length} spell${spells.length === 1 ? "" : "s"} saved`}
        </p>
      </div>

      {pageError ? (
        <div className="empty-favorites">
          <div className="empty-icon">⚠️</div>
          <h2>Couldn't load favorites</h2>
          <p style={{ opacity: 0.8 }}>{pageError}</p>
          <button className="browse-btn" onClick={() => navigate("/library")} type="button">
            Back to Library
          </button>
        </div>
      ) : spells.length === 0 ? (
        <div className="empty-favorites">
          <div className="empty-icon">💫</div>
          <h2>No favorites yet</h2>
          <p>Browse spells and click the heart icon to save your favorites here.</p>
          <button className="browse-btn" onClick={() => navigate("/library")} type="button">
            Browse Spell Library
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
                className="favorite-btn"
                onClick={(e) => handleUnfavorite(spell.id, e)}
                aria-label="Remove from favorites"
                type="button"
              >
                <HiHeart className="heart-icon filled" />
              </button>

              {spell.imageUrl && (
                <img src={spell.imageUrl} alt={spell.title} className="spell-image" />
              )}

              <div className="spell-content">
                <div className="spell-badges">
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
    </div>
  );
}

export default Favorites;