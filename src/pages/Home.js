import {
  HiOutlineSearch,
  HiOutlineLightningBolt,
  HiOutlineMoon,
  HiOutlineDeviceMobile,
  HiOutlineSparkles,
  HiOutlineHeart,
} from "react-icons/hi";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserSubscription } from "../userService";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [userSubscription, setUserSubscription] = useState("free");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.warn("[Home] getUser error:", error);

        const user = data?.user;
        if (!alive) return;

        if (!user?.id) {
          setUserSubscription("free");
          return;
        }

        const status = await getUserSubscription(user.id);
        if (!alive) return;

        setUserSubscription(status);
      } catch (err) {
        console.error("[Home] subscription check failed:", err);
        if (!alive) return;
        setUserSubscription("free");
      }
    };

    load();

    // Re-check on login/logout/session refresh
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section with Image */}
      <section className="hero">
        <div className="hero-image-container">
          <img
            src="/images/homepage-hero.png"
            alt="Cozy spell ritual setup"
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Your Personal Library of
            <br />
            <span className="highlight">Practical Magic</span>
          </h1>
          <p className="hero-subtitle">
            150+ curated spells for busy people. No elaborate setups. No gatekeeping.
            Just real magic that fits your real life.
          </p>

          <div className="hero-actions">
            <button className="cta-primary" onClick={() => navigate("/library")} type="button">
              Browse Spell Library
            </button>

            {userSubscription === "free" && (
              <button className="cta-secondary" onClick={() => navigate("/subscribe")} type="button">
                Unlock Premium Spells
              </button>
            )}
          </div>

          {userSubscription === "premium" && (
            <div className="premium-badge-hero">✨ Premium Member</div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stat-card">
          <div className="stat-number">150+</div>
          <div className="stat-label">Curated Spells</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">5-60min</div>
          <div className="stat-label">Time Range</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">14+</div>
          <div className="stat-label">Categories</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2 className="section-title">Everything You Need</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineSearch />
            </div>
            <h3>Smart Search & Filters</h3>
            <p>Find exactly what you need by category, time, skill level, or situation.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineLightningBolt />
            </div>
            <h3>Quick Rituals</h3>
            <p>50+ spells under 5 minutes. Magic that fits into your morning coffee routine.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineMoon />
            </div>
            <h3>Deep Ceremonial Work</h3>
            <p>Full moon rituals, shadow work, and powerful transformative practices.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineDeviceMobile />
            </div>
            <h3>Mobile Optimized</h3>
            <p>Access your spells anywhere. Perfect for quick reference during rituals.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineSparkles />
            </div>
            <h3>New Spells Added Over Time</h3>
            <p>Fresh content added regularly. Your library keeps growing.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <HiOutlineHeart />
            </div>
            <h3>No Gatekeeping</h3>
            <p>Clear instructions. Real psychology. Magic for real people with real lives.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {userSubscription === "free" && (
        <section className="cta-section">
          <h2>Ready to Unlock Your Full Library?</h2>
          <p>One-time purchase. Lifetime access. Instant unlock.</p>
          <button className="cta-large" onClick={() => navigate("/subscribe")} type="button">
            Unlock Premium
          </button>
        </section>
      )}
    </div>
  );
}

export default Home;
