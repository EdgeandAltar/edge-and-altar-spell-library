import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getUserSubscription } from '../userService';
import { getUserFavorites, addToFavorites, removeFromFavorites, isSpellFavorited } from '../favoritesService';
import { addJournalEntry } from '../journalService';
import { generateSpellPDF } from '../pdfService';
import { HiOutlineHeart, HiHeart, HiOutlineDownload, HiOutlinePencilAlt } from 'react-icons/hi2';
import LoadingSpinner from '../components/LoadingSpinner';
import './SpellDetail.css';

function SpellDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spell, setSpell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState('free');
  const [favorites, setFavorites] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalRating, setJournalRating] = useState(0);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalTags, setJournalTags] = useState([]);
  const [relatedSpells, setRelatedSpells] = useState([]);

  useEffect(() => {
    fetchSpell();
  }, [id]);

  useEffect(() => {
    loadFavorites();
    checkSubscription();
  }, []);

  useEffect(() => {
    if (spell && userSubscription) {
      findRelatedSpells();
    }
  }, [spell, userSubscription]); // ✅ Added userSubscription dependency

  const fetchSpell = async () => {
    try {
      const docRef = doc(db, 'spells', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSpell({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log('No such spell!');
      }
    } catch (error) {
      console.error('Error fetching spell:', error);
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
    if (user && id) {
      const userFavorites = await getUserFavorites(user.uid);
      setFavorites(userFavorites);
      setIsFavorited(isSpellFavorited(userFavorites, id));
    }
  };

  const toggleFavorite = async () => {
    const user = auth.currentUser;
    if (!user || !spell) return;
    
    if (isFavorited) {
      const success = await removeFromFavorites(user.uid, spell.id);
      if (success) {
        setFavorites(favorites.filter(fId => fId !== spell.id));
        setIsFavorited(false);
      }
    } else {
      const success = await addToFavorites(user.uid, spell.id);
      if (success) {
        setFavorites([...favorites, spell.id]);
        setIsFavorited(true);
      }
    }
  };

  const handleAddToJournal = async () => {
    const user = auth.currentUser;
    if (!user || !spell) return;
    
    const entry = {
      spellId: spell.id,
      spellTitle: spell.title,
      rating: journalRating,
      notes: journalNotes,
      tags: journalTags
    };
    
    const success = await addJournalEntry(user.uid, entry);
    
    if (success) {
      setShowJournalModal(false);
      setJournalRating(0);
      setJournalNotes('');
      setJournalTags([]);
      alert('Added to your spell journal!');
    }
  };

  const addTag = (tag) => {
    if (tag && !journalTags.includes(tag)) {
      setJournalTags([...journalTags, tag]);
    }
  };

  const removeTag = (tagToRemove) => {
    setJournalTags(journalTags.filter(tag => tag !== tagToRemove));
  };

  const handleDownloadPDF = () => {
    if (spell) {
      generateSpellPDF(spell);
    }
  };

  // ✅ UPDATED: Filter out premium spells for free users in related spells
  const findRelatedSpells = async () => {
    if (!spell) return;
    
    try {
      const allSpellsQuery = query(collection(db, 'spells'));
      const querySnapshot = await getDocs(allSpellsQuery);
      const allSpells = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Score spells by similarity
      const scored = allSpells
        .filter(s => s.id !== spell.id) // Exclude current spell
        .filter(s => {
          // ✅ NEW: If user is free, only show free spells in related
          if (userSubscription === 'free') {
            return !s.isPremium;
          }
          return true; // Premium users see all related spells
        })
        .map(s => {
          let score = 0;
          
          // Same category = +3 points
          if (s.category === spell.category) score += 3;
          
          // Same time required = +2 points
          if (s.timeRequired === spell.timeRequired) score += 2;
          
          // Same skill level = +1 point
          if (s.skillLevel === spell.skillLevel) score += 1;
          
          // Same supplies = +1 point
          if (s.suppliesNeeded === spell.suppliesNeeded) score += 1;
          
          return { ...s, score };
        })
        .filter(s => s.score > 0) // Only show spells with some similarity
        .sort((a, b) => b.score - a.score) // Sort by highest score
        .slice(0, 4); // Take top 4
      
      setRelatedSpells(scored);
    } catch (error) {
      console.error('Error finding related spells:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading spell..." />;
  }

  if (!spell) {
    return (
      <div className="error-container">
        <h2>Spell not found</h2>
        <button onClick={() => navigate('/library')}>Back to Library</button>
      </div>
    );
  }

  if (spell.isPremium && userSubscription === 'free') {
    return (
      <div className="spell-detail-container">
        <button className="back-button" onClick={() => navigate('/library')}>
          ← Back to Library
        </button>
        
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '60px 40px', 
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: '#7D5E4F', marginBottom: '16px' }}>Premium Spell</h2>
          <p style={{ color: '#7d6e57', fontSize: '18px', marginBottom: '32px' }}>
            This spell is only available to premium members.
          </p>
          <button 
            onClick={() => navigate('/subscribe')}
            style={{
              padding: '16px 32px',
              background: '#7D5E4F',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spell-detail-container">
      <button className="back-button" onClick={() => navigate('/library')}>
        ← Back to Library
      </button>

      <div className="spell-detail">
        {spell.imageUrl && (
          <img src={spell.imageUrl} alt={spell.title} className="spell-detail-image" />
        )}

        <div className="spell-header">
          <div className="spell-title-row">
            <h1>{spell.title}</h1>
            <button 
              className="download-btn-detail"
              onClick={handleDownloadPDF}
            >
              <HiOutlineDownload /> Download PDF
            </button>
            <div className="header-actions">
              <button 
                className="journal-btn-detail"
                onClick={() => setShowJournalModal(true)}
              >
                <HiOutlinePencilAlt /> Add to Journal
              </button>
              <button 
                className="favorite-btn-detail"
                onClick={toggleFavorite}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorited ? (
                  <HiHeart className="heart-icon-detail filled" />
                ) : (
                  <HiOutlineHeart className="heart-icon-detail" />
                )}
              </button>
            </div>
          </div>
          
          <div className="spell-tags">
            {spell.isPremium && <span className="tag premium">Premium</span>}
            <span className="tag">{spell.category}</span>
            <span className="tag">{spell.timeRequired}</span>
            <span className="tag">{spell.skillLevel}</span>
          </div>
        </div>

        <section className="spell-section">
          <h2>When to Use</h2>
          <p>{spell.whenToUse}</p>
        </section>

        {spell.vibe && (
          <section className="spell-section">
            <h2>Vibe</h2>
            <p>{spell.vibe}</p>
          </section>
        )}

        {spell.suppliesNeeded && (
          <section className="spell-section">
            <h2>Supplies Needed</h2>
            <p>{spell.suppliesNeeded}</p>
          </section>
        )}

        <section className="spell-section">
          <h2>What You Need</h2>
          <ul className="ingredients-list">
            {spell.ingredients?.split('\n').map((ingredient, index) => (
              ingredient.trim() && <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </section>

        <section className="spell-section">
          <h2>How to Do It</h2>
          <div className="instructions">
            {spell.instructions?.split('\n').map((line, index) => (
              line.trim() && <p key={index}>{line}</p>
            ))}
          </div>
        </section>

        {spell.whyThisWorks && (
          <section className="spell-section why-section">
            <h2>Why This Works</h2>
            <p className="why-text">{spell.whyThisWorks}</p>
          </section>
        )}

        {spell.spokenIntention && (
          <section className="spell-section intention">
            <h2>Spoken Intention</h2>
            <blockquote>"{spell.spokenIntention}"</blockquote>
          </section>
        )}

        {spell.tips && (
          <section className="spell-section">
            <h2>Tips & Modifications</h2>
            <p>{spell.tips}</p>
          </section>
        )}
      </div>

      {/* Related Spells */}
      {relatedSpells.length > 0 && (
        <div className="related-spells-section">
          <h2>You Might Also Like</h2>
          <div className="related-spells-grid">
            {relatedSpells.map(relatedSpell => (
              <div 
                key={relatedSpell.id}
                className="related-spell-card"
                onClick={() => navigate(`/spell/${relatedSpell.id}`)}
              >
                {relatedSpell.imageUrl && (
                  <img src={relatedSpell.imageUrl} alt={relatedSpell.title} />
                )}
                <div className="related-spell-content">
                  <h4>{relatedSpell.title}</h4>
                  <div className="related-spell-meta">
                    <span>{relatedSpell.category}</span>
                    <span>•</span>
                    <span>{relatedSpell.timeRequired}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
          <div className="journal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Journal</h2>
            <p className="modal-subtitle">{spell.title}</p>
            
            <div className="modal-section">
              <label>How effective was it?</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    className={`star-btn ${star <= journalRating ? 'filled' : ''}`}
                    onClick={() => setJournalRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <label>Notes (optional)</label>
              <textarea
                placeholder="How did it feel? What happened? Any modifications you made?"
                value={journalNotes}
                onChange={(e) => setJournalNotes(e.target.value)}
                rows="4"
              />
            </div>

            <div className="modal-section">
              <label>Quick Tags (optional)</label>
              <div className="tag-suggestions">
                {['worked well', 'felt powerful', 'subtle shift', 'will try again', 'modified it'].map(tag => (
                  <button
                    key={tag}
                    className="tag-btn"
                    onClick={() => addTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              {journalTags.length > 0 && (
                <div className="selected-tags">
                  {journalTags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowJournalModal(false)}
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={handleAddToJournal}
              >
                Save to Journal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpellDetail;