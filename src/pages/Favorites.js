import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getUserFavorites, removeFromFavorites } from '../favoritesService';
import { HiHeart } from 'react-icons/hi';
import LoadingSpinner from '../components/LoadingSpinner';
import './Favorites.css';

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [spells, setSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's favorite spell IDs
      const favoriteIds = await getUserFavorites(user.uid);
      setFavorites(favoriteIds);

      if (favoriteIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch the actual spell data
      // Firestore 'in' queries are limited to 10 items, so batch if needed
      const batchSize = 10;
      const allSpells = [];

      for (let i = 0; i < favoriteIds.length; i += batchSize) {
        const batch = favoriteIds.slice(i, i + batchSize);
        const q = query(
          collection(db, 'spells'),
          where(documentId(), 'in', batch)
        );
        const querySnapshot = await getDocs(q);
        const batchSpells = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        allSpells.push(...batchSpells);
      }

      setSpells(allSpells);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
    setLoading(false);
  };

  const handleUnfavorite = async (spellId, e) => {
    e.stopPropagation();
    
    const user = auth.currentUser;
    if (!user) return;

    const success = await removeFromFavorites(user.uid, spellId);
    if (success) {
      setFavorites(favorites.filter(id => id !== spellId));
      setSpells(spells.filter(spell => spell.id !== spellId));
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading your favorites..." />;
  }

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h1>My Favorites</h1>
        <p className="subtitle">
          {spells.length === 0 
            ? "No favorites yet" 
            : `${spells.length} spell${spells.length === 1 ? '' : 's'} saved`
          }
        </p>
      </div>

      {spells.length === 0 ? (
        <div className="empty-favorites">
          <div className="empty-icon">💫</div>
          <h2>No favorites yet</h2>
          <p>Browse spells and click the heart icon to save your favorites here.</p>
          <button 
            className="browse-btn"
            onClick={() => navigate('/library')}
          >
            Browse Spell Library
          </button>
        </div>
      ) : (
        <div className="spell-grid">
          {spells.map(spell => (
            <div 
              key={spell.id} 
              className="spell-card"
              onClick={() => navigate(`/spell/${spell.id}`)}
            >
              <button 
                className="favorite-btn"
                onClick={(e) => handleUnfavorite(spell.id, e)}
                aria-label="Remove from favorites"
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