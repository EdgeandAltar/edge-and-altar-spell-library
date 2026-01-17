import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Subscribe.css";
import {
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineArrowPath,
  HiOutlineSparkles,
} from "react-icons/hi2";

import { supabase } from "../supabaseClient";

function Subscribe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Get the access token on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          setAccessToken(data.session.access_token);
        }
      } catch (err) {
        console.warn("[Subscribe] Failed to get session:", err);
      }
    };
    getToken();

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAccessToken(session?.access_token || null);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const handleCheckout = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // Check if we have an access token
      if (!accessToken) {
        throw new Error("You must be signed in to unlock premium.");
      }

      const origin = window.location.origin;
      console.log("[checkout] invoking create-checkout with origin:", origin);

      // Use direct fetch instead of supabase.functions.invoke
      const response = await fetch(
        "https://wmsekzsocvmfudmjakhu.supabase.co/functions/v1/create-checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ origin }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Checkout failed. Please try again.");
      }

      const url = data?.url;
      if (typeof url !== "string" || !url.startsWith("http")) {
        throw new Error("No valid checkout URL returned from server.");
      }

      window.location.assign(url);
    } catch (err) {
      console.error("[checkout] error:", err);
      alert(
        err?.message || "Could not start checkout. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscribe-page">
      {/* Hero Section */}
      <section className="subscribe-hero">
        <h1>Unlock Your Full Spell Library</h1>
        <p className="hero-description">
          One-time purchase. Lifetime access. Instant unlock.
        </p>
      </section>

      {/* Pricing Card */}
      <section className="pricing-section">
        <div className="pricing-cards">
          <div className="pricing-card featured selected">
            <div className="best-value-badge">LIFETIME ACCESS</div>

            <div className="plan-header">
              <h3>Premium Spell Library</h3>

              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">49</span>
                <span className="period">one-time</span>
              </div>

              <p className="plan-description">
                Pay once. Keep it forever. No subscriptions.
              </p>
            </div>

            <ul className="feature-list">
              <li>
                <span className="check">✓</span> 100+ premium spells
              </li>
              <li>
                <span className="check">✓</span> New spells added weekly
              </li>
              <li>
                <span className="check">✓</span> Advanced search & filters
              </li>
              <li>
                <span className="check">✓</span> Save favorites
              </li>
              <li>
                <span className="check">✓</span> Printable spell cards
              </li>
              <li>
                <span className="check">✓</span> Mobile-optimized access
              </li>
              <li>
                <span className="check">✓</span> Instant unlock after payment
              </li>
            </ul>
          </div>
        </div>

        <button
          className="subscribe-button"
          onClick={handleCheckout}
          disabled={loading}
          type="button"
        >
          {loading ? "Redirecting..." : "Unlock Premium (One-Time Purchase)"}
        </button>
      </section>

      {/* What You Get Section */}
      <section className="benefits-section">
        <h2>What You Get with Premium</h2>
        <div className="benefits-grid">
          <div className="benefit">
            <div className="benefit-icon">
              <HiOutlineBookOpen />
            </div>
            <h4>100+ Premium Spells</h4>
            <p>Access our complete library of curated rituals and ceremonies</p>
          </div>

          <div className="benefit">
            <div className="benefit-icon">
              <HiOutlineCheckCircle />
            </div>
            <h4>Every Situation Covered</h4>
            <p>From 5-minute morning rituals to deep ceremonial work</p>
          </div>

          <div className="benefit">
            <div className="benefit-icon">
              <HiOutlineArrowPath />
            </div>
            <h4>Always Growing</h4>
            <p>New spells added weekly — yours forever</p>
          </div>

          <div className="benefit">
            <div className="benefit-icon">
              <HiOutlineSparkles />
            </div>
            <h4>No Gatekeeping</h4>
            <p>Clear instructions. Real psychology. Magic for real people.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-elements">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>Secure payment via Stripe</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon"></span>
            <span>Apple Pay / Google Pay supported</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">✓</span>
            <span>One-time purchase (no subscription)</span>
          </div>
        </div>
      </section>

      <button
        className="back-button"
        onClick={() => navigate("/library")}
        type="button"
      >
        ← Back to Library
      </button>
    </div>
  );
}

export default Subscribe;