import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./TodaysSpell.css";

function getTodayIndex(totalCount) {
  const now = new Date();
  const dateNum =
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate();
  return dateNum % totalCount;
}

function getTeaser(text) {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const excerpt = sentences.slice(0, 2).join(" ").trim();
  return excerpt || text.slice(0, 180).trim();
}

function TodaysSpell() {
  const [spell, setSpell] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { count, error: countError } = await supabase
          .from("spells")
          .select("*", { count: "exact", head: true })
          .eq("is_premium", false)
          .is("created_by_user_id", null);

        if (countError || !count) {
          if (alive) setLoading(false);
          return;
        }

        const idx = getTodayIndex(count);

        const { data, error } = await supabase
          .from("spells")
          .select("id, title, category, time_required, when_to_use, is_premium")
          .eq("is_premium", false)
          .is("created_by_user_id", null)
          .order("id")
          .range(idx, idx);

        if (!alive) return;

        if (error || !data?.length) {
          setLoading(false);
          return;
        }

        setSpell(data[0]);
        setLoading(false);
      } catch (err) {
        console.warn("[TodaysSpell] load failed:", err);
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, []);

  // Hide section entirely on error or empty result
  if (!loading && !spell) return null;

  return (
    <section className="todays-spell-section">
      <div className="todays-spell-container">
        {loading ? (
          <div className="todays-spell-skeleton">
            <div className="skeleton-label" />
            <div className="skeleton-divider" />
            <div className="skeleton-title" />
            <div className="skeleton-meta" />
            <div className="skeleton-body" />
            <div className="skeleton-body skeleton-body--short" />
            <div className="skeleton-btn" />
          </div>
        ) : (
          <div className="todays-spell-card">
            <span className="todays-spell-label">Today's Spell</span>
            <hr className="todays-spell-divider" />
            <h2 className="todays-spell-title">{spell.title}</h2>
            <p className="todays-spell-meta">
              {spell.category}
              {spell.time_required && <> &middot; {spell.time_required}</>}
            </p>
            {spell.when_to_use && (
              <p className="todays-spell-teaser">{getTeaser(spell.when_to_use)}</p>
            )}
            <Link
              to={spell.is_premium ? "/subscribe" : `/spell/${spell.id}`}
              className="todays-spell-btn"
            >
              {spell.is_premium ? "🔒 Unlock Spell" : "Open Spell →"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default TodaysSpell;
