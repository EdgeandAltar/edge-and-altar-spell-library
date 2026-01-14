import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './ManageSpells.css';

function ManageSpells() {
  const [spells, setSpells] = useState([]);
  const [filteredSpells, setFilteredSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpells();
  }, []);

  useEffect(() => {
  const term = searchTerm.trim().toLowerCase();

  if (term) {
    const filtered = spells.filter(spell => {
      const title = (spell.title || '').toLowerCase();
      const category = (spell.category || '').toLowerCase();

      // ✅ NEW: tags + seasonalTags searchable too
      const tagsText = (spell.tags || []).join(' ').toLowerCase();
      const seasonalText = (spell.seasonalTags || []).join(' ').toLowerCase();

      return (
        title.includes(term) ||
        category.includes(term) ||
        tagsText.includes(term) ||
        seasonalText.includes(term)
      );
    });

    setFilteredSpells(filtered);
  } else {
    setFilteredSpells(spells);
  }
}, [searchTerm, spells]);


  const fetchSpells = async () => {
    try {
      const q = query(collection(db, 'spells'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const spellsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSpells(spellsData);
      setFilteredSpells(spellsData);
    } catch (error) {
      console.error('Error fetching spells:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (spellId) => {
    try {
      await deleteDoc(doc(db, 'spells', spellId));
      setSpells(spells.filter(spell => spell.id !== spellId));
      setDeleteConfirm(null);
      alert('Spell deleted successfully!');
    } catch (error) {
      console.error('Error deleting spell:', error);
      alert('Error deleting spell. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading spells...</div>;
  }

  return (
    <div className="manage-container">
      <div className="manage-header">
        <h1>Manage Spells</h1>
        <p className="subtitle">Total: {spells.length} spells ({spells.filter(s => s.isPremium).length} premium, {spells.filter(s => !s.isPremium).length} free)</p>
      </div>

      <div className="manage-actions">
        <input
          type="text"
          className="search-bar"
placeholder="Search spells by title, category, tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          className="add-new-btn"
          onClick={() => navigate('/admin')}
        >
          + Add New Spell
        </button>
      </div>

      {filteredSpells.length === 0 ? (
        <div className="no-results">
          <p>No spells found.</p>
        </div>
      ) : (
        <div className="spells-table">
          {filteredSpells.map(spell => (
            <div key={spell.id} className="spell-row">
              <div className="spell-info">
                {spell.imageUrl && (
                  <img src={spell.imageUrl} alt={spell.title} className="spell-thumbnail" />
                )}
                <div className="spell-details">
                  <h3>{spell.title}</h3>
                  <div className="spell-meta">
                    <span className="badge">{spell.category}</span>
                    <span className="badge">{spell.timeRequired}</span>
                    <span className="badge">{spell.skillLevel}</span>
                    {spell.isPremium && <span className="badge premium">Premium</span>}
                  </div>
                </div>
              </div>
              
              <div className="spell-actions">
                <button 
                  className="edit-btn"
                  onClick={() => navigate(`/edit-spell/${spell.id}`)}
                >
                  Edit
                </button>
                <button 
                  className="view-btn"
                  onClick={() => navigate(`/spell/${spell.id}`)}
                >
                  View
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => setDeleteConfirm(spell.id)}
                >
                  Delete
                </button>
              </div>

              {deleteConfirm === spell.id && (
                <div className="delete-confirm">
                  <p>Are you sure you want to delete "{spell.title}"?</p>
                  <div className="confirm-actions">
                    <button 
                      className="confirm-yes"
                      onClick={() => handleDelete(spell.id)}
                    >
                      Yes, Delete
                    </button>
                    <button 
                      className="confirm-no"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageSpells;