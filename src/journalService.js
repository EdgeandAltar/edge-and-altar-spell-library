import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// Get user's journal entries
export const getUserJournal = async (userId) => {
  try {
    const journalDoc = await getDoc(doc(db, 'spellJournal', userId));
    if (journalDoc.exists()) {
      return journalDoc.data().entries || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting journal:', error);
    return [];
  }
};

// Add journal entry
export const addJournalEntry = async (userId, entry) => {
  try {
    const journalRef = doc(db, 'spellJournal', userId);
    const journalDoc = await getDoc(journalRef);
    
    const newEntry = {
      id: Date.now().toString(),
      spellId: entry.spellId,
      spellTitle: entry.spellTitle,
      date: new Date().toISOString(),
      rating: entry.rating || null,
      notes: entry.notes || '',
      tags: entry.tags || []
    };
    
    if (journalDoc.exists()) {
      await updateDoc(journalRef, {
        entries: arrayUnion(newEntry)
      });
    } else {
      await setDoc(journalRef, {
        entries: [newEntry]
      });
    }
    return newEntry;
  } catch (error) {
    console.error('Error adding journal entry:', error);
    return null;
  }
};

// Update journal entry
export const updateJournalEntry = async (userId, entryId, updates) => {
  try {
    const journalRef = doc(db, 'spellJournal', userId);
    const journalDoc = await getDoc(journalRef);
    
    if (journalDoc.exists()) {
      const entries = journalDoc.data().entries || [];
      const updatedEntries = entries.map(entry => 
        entry.id === entryId ? { ...entry, ...updates } : entry
      );
      
      await updateDoc(journalRef, {
        entries: updatedEntries
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating journal entry:', error);
    return false;
  }
};

// Delete journal entry
export const deleteJournalEntry = async (userId, entryId) => {
  try {
    const journalRef = doc(db, 'spellJournal', userId);
    const journalDoc = await getDoc(journalRef);
    
    if (journalDoc.exists()) {
      const entries = journalDoc.data().entries || [];
      const entryToRemove = entries.find(e => e.id === entryId);
      
      if (entryToRemove) {
        await updateDoc(journalRef, {
          entries: arrayRemove(entryToRemove)
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return false;
  }
};

// Get entries for specific spell
export const getEntriesForSpell = (entries, spellId) => {
  return entries.filter(entry => entry.spellId === spellId);
};

// Get recent entries
export const getRecentEntries = (entries, count = 10) => {
  return entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
};