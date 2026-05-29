import React from "react";
import { useNavigate } from "react-router-dom";
import "./MoneyMagicLocked.css";

const WEEKS = [
  { num: "Week 1", theme: "Awareness",  desc: "Where your money story came from and what it has cost you" },
  { num: "Week 2", theme: "Worthiness", desc: "Claiming the value you have been denying and learning to receive" },
  { num: "Week 3", theme: "Action",     desc: "Building real financial systems from a place of abundance not fear" },
  { num: "Week 4", theme: "Expansion",  desc: "Embodying the version of you that wealth flows to naturally" },
];

const INCLUDES = [
  "30 days of guided prompts, creative activities, mini-rituals, and psychology notes",
  "Before and after snapshot to witness your transformation",
  "Weekly reflections to integrate your progress",
  "Always-accessible reference guides including money altar setup and scarcity reset ritual",
  "Micro-win tracker to celebrate every step forward",
  "Permanent access to your completed entries — even if you cancel premium",
];

const JOURNAL_ONLY_URL = "https://buy.stripe.com/4gM5kF6OG4GA8doeaX1ZS04";

function MoneyMagicLocked() {
  const navigate = useNavigate();

  return (
    <div className="mml-page">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="mml-hero">
        <p className="mml-eyebrow">Edge &amp; Altar · Money Magic Journal</p>
        <h1 className="mml-title">Transform Your Relationship with Money in 30 Days</h1>
        <p className="mml-subtitle">Psychology-backed. Ritual-grounded. No toxic positivity.</p>
      </section>

      {/* ── Body copy ─────────────────────────────────────────────────────── */}
      <section className="mml-body-section">
        <p className="mml-body-p">
          Most money programs give you budgeting advice you already know or manifestation fluff that ignores reality.
        </p>
        <p className="mml-body-p mml-body-p--accent">
          The Money Magic Journal does something different.
        </p>
        <p className="mml-body-p">
          Over 30 days, you will trace your money beliefs back to where they started, release the shame and scarcity patterns keeping you stuck, claim the worthiness you have been denying yourself, build real financial systems that actually work, and expand into a vision of abundance that feels true — not performative.
        </p>
        <p className="mml-body-p">
          Each day takes about 10 minutes and includes a journal prompt designed to surface your real patterns, a creative activity that makes transformation tangible, a 2–5 minute mini-ritual that anchors your intention, and a psychology note explaining exactly why it works.
        </p>
      </section>

      <div className="mml-divider"><span className="mml-divider-ornament">✦ ✦ ✦</span></div>

      {/* ── What 30 days looks like ───────────────────────────────────────── */}
      <section className="mml-weeks">
        <h2 className="mml-section-heading">What 30 days looks like</h2>
        <div className="mml-weeks-grid">
          {WEEKS.map((w) => (
            <div key={w.num} className="mml-week-card">
              <p className="mml-week-num">{w.num}</p>
              <p className="mml-week-theme">{w.theme}</p>
              <p className="mml-week-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you get ──────────────────────────────────────────────────── */}
      <section className="mml-includes">
        <h2 className="mml-section-heading">What you get</h2>
        <ul className="mml-includes-list">
          {INCLUDES.map((item, i) => (
            <li key={i} className="mml-includes-item">{item}</li>
          ))}
        </ul>
        <p className="mml-includes-note">
          No elaborate supplies needed. No prior magic experience required. Just 10 minutes a day and willingness to be honest with yourself.
        </p>
      </section>

      <div className="mml-divider"><span className="mml-divider-ornament">✦ ✦ ✦</span></div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="mml-cta-section">
        <h2 className="mml-section-heading">Two ways to access</h2>

        <div className="mml-cta-cards">

          {/* Premium */}
          <div className="mml-cta-card mml-cta-card--premium">
            <p className="mml-cta-option-label">Option 1 — Premium Membership</p>
            <p className="mml-cta-price">
              $7<span className="mml-cta-price-period">/month</span>
            </p>
            <p className="mml-cta-price-alt">or $49 lifetime</p>
            <p className="mml-cta-desc">
              Includes the Money Magic Journal plus 149 premium spells, the full spell library, collections, and everything Edge &amp; Altar has to offer.
            </p>
            <button
              className="mml-cta-btn mml-cta-btn--premium"
              type="button"
              onClick={() => navigate("/subscribe")}
            >
              Unlock with Premium →
            </button>
          </div>

          {/* Journal Only */}
          <div className="mml-cta-card mml-cta-card--standalone">
            <p className="mml-cta-option-label">Option 2 — Journal Only</p>
            <p className="mml-cta-price">
              $27<span className="mml-cta-price-period"> one-time</span>
            </p>
            <p className="mml-cta-price-alt">Lifetime access</p>
            <p className="mml-cta-desc">
              Lifetime access to the Money Magic Journal through the Edge &amp; Altar app. Create a free account to get started.
            </p>
            <a
              className="mml-cta-btn mml-cta-btn--standalone"
              href={JOURNAL_ONLY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get the Journal →
            </a>
          </div>

        </div>

        <p className="mml-reassurance">
          Already purchased? Make sure you are signed in with the same email address you used at checkout. If you are having trouble accessing your journal email{" "}
          <a className="mml-reassurance-link" href="mailto:wendy@edgeandaltar.com">
            wendy@edgeandaltar.com
          </a>.
        </p>
      </section>

    </div>
  );
}

export default MoneyMagicLocked;
