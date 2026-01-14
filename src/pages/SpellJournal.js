import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserJournal, deleteJournalEntry, getRecentEntries } from '../journalService';
import { HiOutlineTrash, HiOutlineStar } from 'react-icons/hi';
import { HiStar } from 'react-icons/hi';
import './SpellJournal.css';
import MoonPhaseWidget from '../components/MoonPhaseWidget';

function SpellJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, recent, high-rated
  const navigate = useNavigate();

  useEffect(() => {
    loadJournal();
  }, []);

  const loadJournal = async () => {
    const user = auth.currentUser;
    if (user) {
      const journalEntries = await getUserJournal(user.uid);
      setEntries(journalEntries);
    }
    setLoading(false);
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Delete this journal entry?')) {
      const user = auth.currentUser;
      if (user) {
        const success = await deleteJournalEntry(user.uid, entryId);
        if (success) {
          setEntries(entries.filter(e => e.id !== entryId));
        }
      }
    }
  };

  const getFilteredEntries = () => {
    let filtered = [...entries];
    
    if (filter === 'recent') {
      return getRecentEntries(filtered, 10);
    } else if (filter === 'high-rated') {
      filtered = filtered.filter(e => e.rating >= 4);
    }
    
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const renderStars = (rating) => {
    return (
      <div className="star-display">
        {[1, 2, 3, 4, 5].map(star => (
          star <= rating ? (
            <HiStar key={star} className="star filled" />
          ) : (
            <HiOutlineStar key={star} className="star" />
          )
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="journal-container">
        <p>Loading your journal...</p>
      </div>
    );
  }

  const filteredEntries = getFilteredEntries();

  return (
    <div className="journal-container">
      {/* Hero Section with Image */}
      <div className="journal-hero">
        <div className="hero-image-container">
          <img 
            src="/images/journal-hero.png" 
            alt="Journal and ritual reflection" 
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="journal-header">
          <h1>My Spell Journal</h1>
          <p className="subtitle">
            {entries.length === 0 
              ? "Start tracking your magical practice" 
              : `${entries.length} spell${entries.length === 1 ? '' : 's'} recorded`
            }
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-journal">
          <div className="empty-icon">✨</div>
          <h2>Ready to start journaling?</h2>
          <p>Track which spells you've tried, how they worked, and what magic happened. Your practice, your way.</p>
          <button 
            className="browse-btn"
            onClick={() => navigate('/library')}
          >
            Browse Spells
          </button>
        </div>
      ) : (
        <>
          <div className="journal-filters">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All Entries
            </button>
            <button 
              className={filter === 'recent' ? 'active' : ''}
              onClick={() => setFilter('recent')}
            >
              Recent (10)
            </button>
            <button 
              className={filter === 'high-rated' ? 'active' : ''}
              onClick={() => setFilter('high-rated')}
            >
              High Rated (4-5★)
            </button>
          </div>

          <div className="journal-entries">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="journal-entry">
                <div className="entry-header">
                  <div className="entry-title-section">
                    <h3 
                      onClick={() => navigate(`/spell/${entry.spellId}`)}
                      className="spell-link"
                    >
                      {entry.spellTitle}
                    </h3>
                    <span className="entry-date">{formatDate(entry.date)}</span>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>

                {entry.rating && (
                  <div className="entry-rating">
                    {renderStars(entry.rating)}
                  </div>
                )}

                {entry.notes && (
                  <p className="entry-notes">{entry.notes}</p>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="entry-tags">
                    {entry.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SpellJournal;