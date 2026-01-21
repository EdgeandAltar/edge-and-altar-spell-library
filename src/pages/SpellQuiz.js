import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SpellQuiz.css";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH0fw-Gj2p4rlQ";

function SpellQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [userSubscription, setUserSubscription] = useState("free");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allSpells, setAllSpells] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.warn("[SpellQuiz] Failed to get session from storage:", err);
      return null;
    }
  };

  useEffect(() => {
    let alive = true;

    const fetchAccessLevel = async (token, userId) => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=access_level`,
          {
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn("[SpellQuiz] profiles fetch failed:", response.status);
          return "free";
        }

        const data = await response.json();
        return data?.[0]?.access_level === "premium" ? "premium" : "free";
      } catch (err) {
        console.warn("[SpellQuiz] fetchAccessLevel error:", err);
        return "free";
      }
    };

    // Fetch spells WITHOUT requiring auth - works for everyone
    const fetchSpellsPublic = async () => {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/spells?select=id,title,when_to_use,category,time_required,skill_level,seasonal_tags,tags,is_premium,image_url,created_at&order=created_at.desc`,
        {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
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
      }));
    };

    const load = async () => {
      try {
        setLoading(true);

        // Always fetch spells first (works for both logged-in and anonymous users)
        const spells = await fetchSpellsPublic();
        if (!alive) return;
        setAllSpells(spells);

        // Then check if user is logged in for subscription status
        const session = getSessionFromStorage();

        if (session?.accessToken && session?.user) {
          // User is logged in
          setIsLoggedIn(true);
          const level = await fetchAccessLevel(session.accessToken, session.user.id);
          if (!alive) return;
          setUserSubscription(level);
        } else {
          // Anonymous user
          setIsLoggedIn(false);
          setUserSubscription("free");
        }
      } catch (err) {
        console.error("[SpellQuiz] load error:", err);
        if (alive) {
          setAllSpells([]);
          setIsLoggedIn(false);
          setUserSubscription("free");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const questions = [
    {
      id: "need",
      question: "What are you working through right now?",
      options: [
        {
          value: "protection",
          label: "I need to protect my energy from specific people or situations",
          category: "Protection",
          tags: ["Energy Protection"],
        },
        {
          value: "money",
          label: "I'm trying to shift my money mindset and attract abundance",
          category: "Money/Abundance",
          tags: ["Confidence Building"],
        },
        {
          value: "boundaries",
          label: "I'm setting boundaries that feel hard to maintain",
          category: "Boundaries",
          tags: ["Boundary Setting"],
        },
        {
          value: "processing",
          label: "I'm processing something heavy (grief, anger, disappointment)",
          category: "Cleansing/Release",
          tags: ["Emotional Cleansing", "Letting Go"],
        },
        {
          value: "grounding",
          label: "I want to ground myself and feel more present",
          category: "Grounding",
          tags: ["Stress Release"],
        },
        {
          value: "clarity",
          label: "I need clarity on a specific decision or path forward",
          category: "Clarity/Focus",
          tags: ["Overwhelm Relief"],
        },
        {
          value: "selflove",
          label: "I'm cultivating more self-love and worth",
          category: "Love/Self-Love",
          tags: ["Self-Permission", "Confidence Building"],
        },
      ],
    },
    {
      id: "time",
      question: "How's your capacity right now?",
      options: [
        {
          value: "quick",
          label: "Stretched thin - I need something under 5 minutes",
          time: "Under 5 min",
          tags: ["Emergency Use"],
        },
        {
          value: "medium",
          label: "I have 15-30 minutes and mental space for ritual",
          time: "15-30 min",
          tags: ["Daily Practice"],
        },
        {
          value: "deep",
          label: "I want to go deep - 60+ minutes of ceremonial work",
          time: "60+ min",
          tags: [],
        },
        {
          value: "desperate",
          label: "I'm exhausted but desperate for support (quick + effective)",
          time: "Under 5 min",
          tags: ["Emergency Use", "When Overwhelmed"],
        },
      ],
    },
    {
      id: "experience",
      question: "Where are you with your practice?",
      options: [
        { value: "beginner", label: "New to this, need clear step-by-step guidance", skill: "Beginner" },
        { value: "intermediate", label: "Comfortable with basics, ready for deeper work", skill: "Intermediate" },
        { value: "advanced", label: "Experienced practitioner looking for new approaches", skill: "Advanced" },
        { value: "skeptical", label: "I need ritual to work around my skepticism/logic brain", skill: "Beginner" },
      ],
    },
    {
      id: "connection",
      question: "What makes magic feel real for you?",
      options: [
        { value: "physical", label: "Physical actions (stirring, lighting, placing objects)", tags: ["Household Items"] },
        { value: "spoken", label: "Spoken words and intentions", tags: [] },
        { value: "meditation", label: "Quiet meditation and visualization", tags: ["No Supplies Needed"] },
        { value: "movement", label: "Movement and embodiment", tags: ["No Supplies Needed"] },
        { value: "writing", label: "Writing and releasing", tags: ["Paper & Pen", "Letting Go"] },
      ],
    },
    {
      id: "resources",
      question: "What do you have access to right now?",
      options: [
        { value: "kitchen", label: "Just me and my kitchen", supplies: "Kitchen items only", tags: ["Kitchen Items Only"] },
        { value: "candles", label: "I have candles and basic tools", supplies: "Candles required", tags: ["Candles Required"] },
        { value: "altar", label: "I have a dedicated altar space", supplies: "Altar setup needed", tags: ["Candles Required"] },
        { value: "nothing", label: "I'm building my practice from scratch", supplies: "No supplies needed", tags: ["No Supplies Needed"] },
      ],
    },
  ];

  const handleAnswer = (option) => {
    const updated = { ...answers, [questions[currentQuestion].id]: option };
    setAnswers(updated);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults(updated);
    }
  };

  const calculateResults = (finalAnswers) => {
    const desiredTags = [
      ...(finalAnswers.need?.tags || []),
      ...(finalAnswers.time?.tags || []),
      ...(finalAnswers.connection?.tags || []),
      ...(finalAnswers.resources?.tags || []),
    ];

    let scored = allSpells
      .map((spell) => {
        let score = 0;

        const spellTags = Array.isArray(spell.tags) ? spell.tags : [];
        const spellSeasonal = Array.isArray(spell.seasonalTags) ? spell.seasonalTags : [];

        if (finalAnswers.need?.category === spell.category) score += 5;
        if (finalAnswers.time?.time === spell.timeRequired) score += 3;
        if (finalAnswers.experience?.skill === spell.skillLevel) score += 2;

        const matches = desiredTags.filter((t) => spellTags.includes(t));
        score += matches.length * 2;

        const moonish = ["Full Moon", "New Moon", "Dark Moon"];
        const moonMatches = moonish.filter((t) => spellSeasonal.includes(t));
        if (moonMatches.length > 0) score += 1;

        return { ...spell, score };
      })
      .filter((spell) => (userSubscription === "premium" ? true : !spell.isPremium));

    scored.sort((a, b) => b.score - a.score);

    const resultCount = userSubscription === "premium" ? 8 : 3;
    setRecommendations(scored.slice(0, resultCount));
    setShowResults(true);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setRecommendations([]);
  };

  // Handle clicking on a spell card
  const handleSpellClick = (spellId) => {
    if (isLoggedIn) {
      navigate(`/spell/${spellId}`);
    } else {
      navigate("/signup");
    }
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-question">
          <h2>Loading spells...</h2>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="quiz-container">
        <div className="quiz-results">
          <h1>Your Personalized Spell Recommendations</h1>

          {/* Banner for anonymous users */}
          {!isLoggedIn && (
            <div className="signup-banner">
              <h3>✨ Your spells are ready</h3>
              <p>Create a free account to access these spells, save your results, and explore 102 free spells in the full library.</p>
              <button onClick={() => navigate("/signup")} className="primary-btn" type="button">
                Create Free Account
              </button>
            </div>
          )}

          {/* Banner for free users (logged in but not premium) */}
          {isLoggedIn && userSubscription === "free" && (
            <div className="upgrade-banner">
              <p>✨ Showing 3 of 8 recommended spells</p>
              <button onClick={() => navigate("/subscribe")} className="upgrade-btn" type="button">
                Unlock All Recommendations
              </button>
            </div>
          )}

          <div className="results-grid">
            {recommendations.map((spell) => (
              <div 
                key={spell.id} 
                className={`result-card ${!isLoggedIn ? 'preview-card' : ''}`} 
                onClick={() => handleSpellClick(spell.id)}
              >
                {spell.imageUrl && <img src={spell.imageUrl} alt={spell.title} />}
                <div className="result-content">
                  <h3>{spell.title}</h3>
                  <div className="result-meta">
                    <span className="badge">{spell.category}</span>
                    <span className="badge">{spell.timeRequired}</span>
                  </div>
                  <p>{spell.whenToUse}</p>
                  {!isLoggedIn && (
                    <span className="login-hint">Create account to access →</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="quiz-actions">
            <button onClick={restartQuiz} className="secondary-btn" type="button">
              Take Quiz Again
            </button>
            {isLoggedIn ? (
              <button onClick={() => navigate("/library")} className="primary-btn" type="button">
                Browse All Spells
              </button>
            ) : (
              <button onClick={() => navigate("/signup")} className="primary-btn" type="button">
                Create Free Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
        </div>
        <p className="progress-text">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      <div className="quiz-question">
        <h2>{questions[currentQuestion].question}</h2>

        <div className="quiz-options">
          {questions[currentQuestion].options.map((option, index) => (
            <button key={index} className="quiz-option" onClick={() => handleAnswer(option)} type="button">
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {currentQuestion > 0 && (
        <button className="back-btn" onClick={() => setCurrentQuestion(currentQuestion - 1)} type="button">
          ← Back
        </button>
      )}
    </div>
  );
}

export default SpellQuiz;