import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getUserSubscription } from '../userService';
import { useNavigate } from 'react-router-dom';
import './SpellQuiz.css';

function SpellQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [userSubscription, setUserSubscription] = useState('free');
  const [allSpells, setAllSpells] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpells();
    checkSubscription();
  }, []);

  const fetchSpells = async () => {
    const querySnapshot = await getDocs(collection(db, 'spells'));
    const spellsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setAllSpells(spellsData);
  };

  const checkSubscription = async () => {
    const user = auth.currentUser;
    if (user) {
      const status = await getUserSubscription(user.uid);
      setUserSubscription(status);
    }
  };

  const questions = [
    {
      id: 'need',
      question: 'What are you working through right now?',
      options: [
        { value: 'protection', label: 'I need to protect my energy from specific people or situations', category: 'Protection', tags: ['Energy Protection'] },
        { value: 'money', label: "I'm trying to shift my money mindset and attract abundance", category: 'Money/Abundance', tags: ['Confidence Building'] },
        { value: 'boundaries', label: "I'm setting boundaries that feel hard to maintain", category: 'Boundaries', tags: ['Boundary Setting'] },
        { value: 'processing', label: "I'm processing something heavy (grief, anger, disappointment)", category: 'Cleansing/Release', tags: ['Emotional Cleansing', 'Letting Go'] },
        { value: 'grounding', label: 'I want to ground myself and feel more present', category: 'Grounding', tags: ['Stress Release'] },
        { value: 'clarity', label: 'I need clarity on a specific decision or path forward', category: 'Clarity/Focus', tags: ['Overwhelm Relief'] },
        { value: 'selflove', label: "I'm cultivating more self-love and worth", category: 'Love/Self-Love', tags: ['Self-Permission', 'Confidence Building'] }
      ]
    },

    {
      id: 'time',
      question: "How's your capacity right now?",
      options: [
        { value: 'quick', label: 'Stretched thin - I need something under 5 minutes', time: 'Under 5 min', tags: ['Emergency Use'] },
        { value: 'medium', label: 'I have 15-30 minutes and mental space for ritual', time: '15-30 min', tags: ['Daily Practice'] },
        { value: 'deep', label: 'I want to go deep - 60+ minutes of ceremonial work', time: '60+ min', tags: [] },
        { value: 'desperate', label: "I'm exhausted but desperate for support (quick + effective)", time: 'Under 5 min', tags: ['Emergency Use', 'When Overwhelmed'] }
      ]
    },

    {
      id: 'experience',
      question: 'Where are you with your practice?',
      options: [
        { value: 'beginner', label: 'New to this, need clear step-by-step guidance', skill: 'Beginner' },
        { value: 'intermediate', label: 'Comfortable with basics, ready for deeper work', skill: 'Intermediate' },
        { value: 'advanced', label: 'Experienced practitioner looking for new approaches', skill: 'Advanced' },
        { value: 'skeptical', label: 'I need ritual to work around my skepticism/logic brain', skill: 'Beginner' }
      ]
    },

    {
      id: 'connection',
      question: 'What makes magic feel real for you?',
      options: [
        { value: 'physical', label: 'Physical actions (stirring, lighting, placing objects)', tags: ['Household Items'] },
        { value: 'spoken', label: 'Spoken words and intentions', tags: [] },
        { value: 'meditation', label: 'Quiet meditation and visualization', tags: ['No Supplies Needed'] },
        { value: 'movement', label: 'Movement and embodiment', tags: ['No Supplies Needed'] },
        { value: 'writing', label: 'Writing and releasing', tags: ['Paper & Pen', 'Letting Go'] }
      ]
    },

    {
      id: 'resources',
      question: 'What do you have access to right now?',
      options: [
        { value: 'kitchen', label: 'Just me and my kitchen', supplies: 'Kitchen items only', tags: ['Kitchen Items Only'] },
        { value: 'candles', label: 'I have candles and basic tools', supplies: 'Candles required', tags: ['Candles Required'] },
        { value: 'altar', label: 'I have a dedicated altar space', supplies: 'Altar setup needed', tags: ['Candles Required'] },
        { value: 'nothing', label: "I'm building my practice from scratch", supplies: 'No supplies needed', tags: ['No Supplies Needed'] }
      ]
    }
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
      ...(finalAnswers.resources?.tags || [])
    ];

    let scored = allSpells
      .map(spell => {
        let score = 0;

        const spellTags = Array.isArray(spell.tags) ? spell.tags : [];
        const spellSeasonal = Array.isArray(spell.seasonalTags) ? spell.seasonalTags : [];

        if (finalAnswers.need?.category === spell.category) score += 5;
        if (finalAnswers.time?.time === spell.timeRequired) score += 3;
        if (finalAnswers.experience?.skill === spell.skillLevel) score += 2;
        if (finalAnswers.resources?.supplies === spell.suppliesNeeded) score += 2;

        const matches = desiredTags.filter(t => spellTags.includes(t));
        score += matches.length * 2;

        const moonish = ['Full Moon', 'New Moon', 'Dark Moon'];
        const moonMatches = moonish.filter(t => spellSeasonal.includes(t));
        if (moonMatches.length > 0) score += 1;

        return { ...spell, score };
      })
      .filter(spell => (userSubscription === 'premium' ? true : !spell.isPremium));

    scored.sort((a, b) => b.score - a.score);

    const resultCount = userSubscription === 'premium' ? 8 : 3;
    setRecommendations(scored.slice(0, resultCount));
    setShowResults(true);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setRecommendations([]);
  };

  if (showResults) {
    return (
      <div className="quiz-container">
        <div className="quiz-results">
          <h1>Your Personalized Spell Recommendations</h1>

          {userSubscription === 'free' && (
            <div className="upgrade-banner">
              <p>✨ Showing 3 of 8 recommended spells</p>
              <button onClick={() => navigate('/subscribe')} className="upgrade-btn">
                Unlock All Recommendations
              </button>
            </div>
          )}

          <div className="results-grid">
            {recommendations.map(spell => (
              <div
                key={spell.id}
                className="result-card"
                onClick={() => navigate(`/spell/${spell.id}`)}
              >
                {spell.imageUrl && <img src={spell.imageUrl} alt={spell.title} />}
                <div className="result-content">
                  <h3>{spell.title}</h3>
                  <div className="result-meta">
                    <span className="badge">{spell.category}</span>
                    <span className="badge">{spell.timeRequired}</span>
                  </div>
                  <p>{spell.whenToUse}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="quiz-actions">
            <button onClick={restartQuiz} className="secondary-btn">
              Take Quiz Again
            </button>
            <button onClick={() => navigate('/library')} className="primary-btn">
              Browse All Spells
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p className="progress-text">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      <div className="quiz-question">
        <h2>{questions[currentQuestion].question}</h2>

        <div className="quiz-options">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className="quiz-option"
              onClick={() => handleAnswer(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {currentQuestion > 0 && (
        <button
          className="back-btn"
          onClick={() => setCurrentQuestion(currentQuestion - 1)}
        >
          ← Back
        </button>
      )}
    </div>
  );
}

export default SpellQuiz;
