import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// Common ingredients list
export const COMMON_INGREDIENTS = [
  // Beverages
  'Coffee', 'Tea', 'Water', 'Milk', 'Wine',
  
  // Spices & Herbs
  'Cinnamon', 'Salt', 'Black Pepper', 'Rosemary', 'Basil', 'Sage', 'Thyme', 
  'Bay Leaves', 'Lavender', 'Mint', 'Chamomile',
  
  // Sweeteners
  'Honey', 'Sugar', 'Brown Sugar',
  
  // Oils & Fats
  'Olive Oil', 'Butter', 'Coconut Oil',
  
  // Candles & Fire
  'White Candle', 'Black Candle', 'Red Candle', 'Green Candle', 'Blue Candle',
  'Matches', 'Lighter', 'Incense',
  
  // Crystals & Stones
  'Clear Quartz', 'Rose Quartz', 'Amethyst', 'Black Tourmaline', 'Citrine',
  
  // Paper & Writing
  'Paper', 'Pen', 'Journal',
  
  // Nature Items
  'Flowers', 'Herbs (fresh)', 'Lemon', 'Orange', 'Apple',
  
  // Other
  'Rice', 'Coins', 'String/Ribbon', 'Small Bowl', 'Plate'
];

// Get user's pantry
export const getUserPantry = async (userId) => {
  try {
    const pantryDoc = await getDoc(doc(db, 'pantry', userId));
    if (pantryDoc.exists()) {
      return pantryDoc.data().ingredients || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting pantry:', error);
    return [];
  }
};

// Add ingredient to pantry
export const addToPantry = async (userId, ingredient) => {
  try {
    const pantryRef = doc(db, 'pantry', userId);
    const pantryDoc = await getDoc(pantryRef);
    
    if (pantryDoc.exists()) {
      await updateDoc(pantryRef, {
        ingredients: arrayUnion(ingredient)
      });
    } else {
      await setDoc(pantryRef, {
        ingredients: [ingredient]
      });
    }
    return true;
  } catch (error) {
    console.error('Error adding to pantry:', error);
    return false;
  }
};

// Remove ingredient from pantry
export const removeFromPantry = async (userId, ingredient) => {
  try {
    const pantryRef = doc(db, 'pantry', userId);
    await updateDoc(pantryRef, {
      ingredients: arrayRemove(ingredient)
    });
    return true;
  } catch (error) {
    console.error('Error removing from pantry:', error);
    return false;
  }
};

// Check if user has ingredient
export const hasIngredient = (pantry, ingredient) => {
  return pantry.includes(ingredient);
};

// Check if user can make spell (has all ingredients)
export const canMakeSpell = (spell, userPantry) => {
  if (!spell.ingredients) return false;
  
  const spellIngredients = spell.ingredients
    .split('\n')
    .map(i => i.trim())
    .filter(i => i.length > 0);
  
  // Check if user has all ingredients (fuzzy matching)
  return spellIngredients.every(spellIng => {
    return userPantry.some(userIng => {
      const spellLower = spellIng.toLowerCase();
      const userLower = userIng.toLowerCase();
      return spellLower.includes(userLower) || userLower.includes(spellLower);
    });
  });
};

// Get spells user can make with their pantry
export const getSpellsCanMake = (allSpells, userPantry) => {
  return allSpells.filter(spell => canMakeSpell(spell, userPantry));
};