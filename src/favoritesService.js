import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// Get user's favorites
export const getUserFavorites = async (userId) => {
  try {
    const favoritesDoc = await getDoc(doc(db, 'favorites', userId));
    if (favoritesDoc.exists()) {
      return favoritesDoc.data().spellIds || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// Add spell to favorites
export const addToFavorites = async (userId, spellId) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesDoc = await getDoc(favoritesRef);
    
    if (favoritesDoc.exists()) {
      // Update existing document
      await updateDoc(favoritesRef, {
        spellIds: arrayUnion(spellId)
      });
    } else {
      // Create new document
      await setDoc(favoritesRef, {
        spellIds: [spellId]
      });
    }
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
};

// Remove spell from favorites
export const removeFromFavorites = async (userId, spellId) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    await updateDoc(favoritesRef, {
      spellIds: arrayRemove(spellId)
    });
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
};

// Check if spell is favorited
export const isSpellFavorited = (favorites, spellId) => {
  return favorites.includes(spellId);
};