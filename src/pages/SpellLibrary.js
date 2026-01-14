import LoadingSpinner from '../components/LoadingSpinner';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getUserSubscription } from '../userService';
import { getUserFavorites, addToFavorites, removeFromFavorites, isSpellFavorited } from '../favoritesService';
import { HiOutlineHeart, HiHeart, HiLockClosed } from 'react-icons/hi';
import './SpellLibrary.css';
import MoonPhaseWidget from '../components/MoonPhaseWidget';

function SpellLibrary() {
  const [spells, setSpells] = useState([]);
  const [filteredSpells, setFilteredSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [userSubscription, setUserSubscription] = useState('free');
  const [favorites, setFavorites] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const navigate = useNavigate();

  // ✅ NEW: Featured slots (exact order you specified)
  const FEATURED_ORDER = [
    "The 'I'm Spiraling' Interrupt Knot",
    "Burnout Recovery Sigil",
    "Mirror Shield Visualization",
    "Permission to Create Badly Ritual",
    "The Starting Line Ritual",
    "New Job Transition Blessing",
    "Nightmare Shield Before Sleep",
    "Grief Metabolism Ritual",
    "Job Interview Confidence Armor",
    "Digital Boundary Ritual"
  ];

  // ✅ NEW: Only pin featured spells when user first lands (no filters/search)
  const isDefaultView = () => {
    return (
      !searchTerm &&
      !selectedCategory &&
      !selectedTime &&
      !selectedSkill &&
      !selectedSeason &&
      !selectedTag
    );
  };

  // ✅ NEW: Sort so featured spells appear first (keeps existing order for the rest)
  const sortWithFeaturedFirst = (spellsList) => {
    if (!isDefaultView()) return spellsList;

    const orderMap = new Map(FEATURED_ORDER.map((title, idx) => [title, idx]));

    return [...spellsList].sort((a, b) => {
      const aIdx = orderMap.has(a.title) ? orderMap.get(a.title) : Infinity;
      const bIdx = orderMap.has(b.title) ? orderMap.get(b.title) : Infinity;

      if (aIdx !== bIdx) return aIdx - bIdx;

      // If neither is featured (or both not found), keep their relative order
      // (JS sort isn't guaranteed stable in all engines historically, but modern V8 is stable.
      // If you want guaranteed stability, we can add a createdAt fallback.)
      return 0;
    });
  };

  const categories = [
    'Protection', 'Money/Abundance', 'Grounding', 'Love/Self-Love',
    'Clarity/Focus', 'Energy/Motivation', 'Boundaries', 'Cleansing/Release',
    'Moon Magic', 'Drink Spells', 'Candle Spells', 'Kitchen Magic',
    'Bath/Water Magic', 'Shadow Work'
  ];

  const timeOptions = [
    'Under 5 min', '5-15 min', '15-30 min', '30-60 min', '60+ min'
  ];

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Ceremonial'];

  const seasonalOptions = [
    'Any Time',
    'Imbolc (Feb 1-2)',
    'Spring Equinox (March 20)',
    'Beltane (May 1)',
    'Summer Solstice (June 21)',
    'Lammas (Aug 1)',
    'Fall Equinox (Sept 22)',
    'Samhain (Oct 31)',
    'Winter Solstice (Dec 21)',
    'Full Moon',
    'New Moon',
    'Dark Moon'
  ];

  const tagOptions = [
    'Anxiety Relief', 'Boundary Setting', 'Emotional Cleansing', 'Energy Protection',
    'Stress Release', 'Confidence Building', 'Letting Go', 'Self-Permission',
    'Guilt Release', 'Overwhelm Relief',
    'After Difficult Conversation', 'Before Bed', 'After Work', 'End of Day',
    'Morning Ritual', 'Before Interaction', 'Emergency Use', 'Daily Practice',
    'When Stuck', 'When Overwhelmed',
    'No Supplies Needed', 'Kitchen Items Only', 'Candles Required',
    'Bath/Water Access', 'Paper & Pen', 'Household Items'
  ];

  useEffect(() => {
    fetchSpells();
    checkSubscription();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterSpells();
  }, [
    spells,
    searchTerm,
    selectedCategory,
    selectedTime,
    selectedSkill,
    selectedSeason,
    selectedTag,
    userSubscription
  ]);

  const fetchSpells = async () => {
    try {
      const q = query(collection(db, 'spells'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const spellsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        seasonalTags: Array.isArray(doc.data().seasonalTags) ? doc.data().seasonalTags : [],
        tags: Array.isArray(doc.data().tags) ? doc.data().tags : []
      }));

      setSpells(spellsData);
      setFilteredSpells(spellsData);
    } catch (error) {
      console.error('Error fetching spells:', error);
    }
    setLoading(false);
  };

  const checkSubscription = async () => {
    const user = auth.currentUser;
    if (user) {
      const status = await getUserSubscription(user.uid);
      setUserSubscription(status);
    }
  };

  const loadFavorites = async () => {
    const user = auth.currentUser;
    if (user) {
      const userFavorites = await getUserFavorites(user.uid);
      setFavorites(userFavorites);
    }
  };

  const toggleFavorite = async (spellId, e) => {
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) return;

    const isFavorited = isSpellFavorited(favorites, spellId);

    if (isFavorited) {
      const success = await removeFromFavorites(user.uid, spellId);
      if (success) {
        setFavorites(favorites.filter(id => id !== spellId));
      }
    } else {
      const success = await addToFavorites(user.uid, spellId);
      if (success) {
        setFavorites([...favorites, spellId]);
      }
    }
  };

  const filterSpells = () => {
    let filtered = [...spells];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(spell => {
        const title = (spell.title || '').toLowerCase();
        const when = (spell.whenToUse || '').toLowerCase();
        const tagsText = (spell.tags || []).join(' ').toLowerCase();
        return title.includes(term) || when.includes(term) || tagsText.includes(term);
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(spell => spell.category === selectedCategory);
    }

    if (selectedTime) {
      filtered = filtered.filter(spell => spell.timeRequired === selectedTime);
    }

    if (selectedSkill) {
      filtered = filtered.filter(spell => spell.skillLevel === selectedSkill);
    }

    if (selectedSeason) {
      filtered = filtered.filter(spell =>
        (spell.seasonalTags || []).includes(selectedSeason)
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(spell =>
        (spell.tags || []).includes(selectedTag)
      );
    }

    // ✅ NEW: Pin featured spells to the top ONLY on default view
    filtered = sortWithFeaturedFirst(filtered);

    setFilteredSpells(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTime('');
    setSelectedSkill('');
    setSelectedSeason('');
    setSelectedTag('');
  };

  const handleSpellClick = (spell) => {
    if (spell.isPremium && userSubscription === 'free') {
      navigate('/subscribe');
    } else {
      navigate(`/spell/${spell.id}`);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading spells..." />;
  }

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
          {userSubscription === 'free' && (
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginTop: '8px' }}>
              You're viewing {filteredSpells.filter(s => !s.isPremium).length} free spells.{' '}
              <button
                onClick={() => navigate('/subscribe')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Upgrade to Premium
              </button>{' '}
              to unlock {filteredSpells.filter(s => s.isPremium).length} premium spells!
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
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          >
            <option value="">Any Time</option>
            {timeOptions.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>

          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            <option value="">All Levels</option>
            {skillLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            <option value="">All Seasons</option>
            {seasonalOptions.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {tagOptions.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {(searchTerm || selectedCategory || selectedTime || selectedSkill || selectedSeason || selectedTag) && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {filteredSpells.length === 0 ? (
        <div className="no-results">
          <p>No spells found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="spell-grid">
          {filteredSpells.map(spell => {
            const isPremiumLocked = spell.isPremium && userSubscription === 'free';

            return (
              <div
                key={spell.id}
                className={`spell-card ${isPremiumLocked ? 'premium-locked' : ''}`}
                onClick={() => handleSpellClick(spell)}
                style={{
                  cursor: 'pointer',
                  position: 'relative'
                }}
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
                  aria-label={isSpellFavorited(favorites, spell.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  {isSpellFavorited(favorites, spell.id) ? (
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
                      filter: isPremiumLocked ? 'blur(3px) brightness(0.7)' : 'none'
                    }}
                  />
                )}

                <div className="spell-content">
                  <div className="spell-badges">
                    {spell.isPremium && <span className="premium-badge">Premium</span>}
                    <span className="time-badge">{spell.timeRequired}</span>
                  </div>

                  <h3 style={{
                    opacity: isPremiumLocked ? 0.7 : 1
                  }}>
                    {spell.title}
                  </h3>

                  <div className="spell-meta">
                    <span className="category">{spell.category}</span>
                    <span className="skill">{spell.skillLevel}</span>
                  </div>

                  <p className="spell-description" style={{
                    opacity: isPremiumLocked ? 0.6 : 1
                  }}>
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
