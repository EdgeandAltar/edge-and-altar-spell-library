import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserPantry, addToPantry, removeFromPantry, COMMON_INGREDIENTS } from '../pantryService';
import { HiOutlineX, HiOutlinePlus } from 'react-icons/hi2';
import './IngredientPantry.css';

function IngredientPantry() {
  const [pantry, setPantry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customIngredient, setCustomIngredient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPantry();
  }, []);

  const loadPantry = async () => {
    const user = auth.currentUser;
    if (user) {
      const userPantry = await getUserPantry(user.uid);
      setPantry(userPantry);
    }
    setLoading(false);
  };

  const handleAdd = async (ingredient) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!pantry.includes(ingredient)) {
      const success = await addToPantry(user.uid, ingredient);
      if (success) {
        setPantry([...pantry, ingredient]);
      }
    }
  };

  const handleRemove = async (ingredient) => {
    const user = auth.currentUser;
    if (!user) return;

    const success = await removeFromPantry(user.uid, ingredient);
    if (success) {
      setPantry(pantry.filter(i => i !== ingredient));
    }
  };

  const handleAddCustom = async () => {
    if (!customIngredient.trim()) return;
    
    await handleAdd(customIngredient.trim());
    setCustomIngredient('');
  };

  const filteredCommonIngredients = COMMON_INGREDIENTS.filter(ing => 
    ing.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !pantry.includes(ing)
  );

  if (loading) {
    return (
      <div className="pantry-container">
        <p>Loading your pantry...</p>
      </div>
    );
  }

  return (
    <div className="pantry-container">
      {/* Hero Section with Image */}
      <div className="pantry-hero">
        <div className="hero-image-container">
          <img 
            src="/images/pantry-hero.png" 
            alt="Herbs and magical ingredients" 
            className="hero-image"
          />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="pantry-header">
          <h1>My Ingredient Pantry</h1>
          <p className="subtitle">Track what you have and discover what you can make</p>
        </div>
      </div>

      {/* Your Pantry */}
      <div className="pantry-section">
        <h2>Your Ingredients ({pantry.length})</h2>
        
        {pantry.length === 0 ? (
          <div className="empty-pantry">
            <p>Your pantry is empty. Add ingredients below to get started!</p>
          </div>
        ) : (
          <div className="pantry-items">
            {pantry.map(ingredient => (
              <div key={ingredient} className="pantry-item">
                <span>{ingredient}</span>
                <button 
                  className="remove-btn"
                  onClick={() => handleRemove(ingredient)}
                  aria-label={`Remove ${ingredient}`}
                >
                  <HiOutlineX />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Ingredient */}
      <div className="pantry-section">
        <h2>Add Custom Ingredient</h2>
        <div className="custom-input">
          <input
            type="text"
            placeholder="Type ingredient name..."
            value={customIngredient}
            onChange={(e) => setCustomIngredient(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <button 
            className="add-custom-btn"
            onClick={handleAddCustom}
          >
            <HiOutlinePlus /> Add
          </button>
        </div>
      </div>

      {/* Common Ingredients */}
      <div className="pantry-section">
        <h2>Common Ingredients</h2>
        <input
          type="text"
          className="search-ingredients"
          placeholder="Search ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="common-ingredients">
          {filteredCommonIngredients.length === 0 ? (
            <p className="no-results">No ingredients found</p>
          ) : (
            filteredCommonIngredients.map(ingredient => (
              <button
                key={ingredient}
                className="common-ingredient-btn"
                onClick={() => handleAdd(ingredient)}
              >
                <HiOutlinePlus /> {ingredient}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Find Spells CTA */}
      {pantry.length > 0 && (
        <div className="pantry-cta">
          <h3>Ready to cast?</h3>
          <p>Find spells you can make with what you have</p>
          <button 
            className="find-spells-btn"
            onClick={() => navigate('/library')}
          >
            Browse Spell Library
          </button>
        </div>
      )}
    </div>
  );
}

export default IngredientPantry;