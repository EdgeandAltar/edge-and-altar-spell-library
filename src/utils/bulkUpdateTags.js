import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Mapping rules: assign tags based on existing spell data
const autoAssignTags = (spell) => {
  const tags = [];

  // TIME-BASED TAGS
  if (spell.timeRequired === 'Under 5 min') tags.push('Under 5 Minutes');
  if (spell.timeRequired === '5-15 min') tags.push('5-15 Minutes');
  if (spell.timeRequired === '15-30 min') tags.push('15-30 Minutes');

  // SUPPLY-BASED TAGS
  if (spell.suppliesNeeded === 'No supplies needed') tags.push('No Supplies Needed');
  if (spell.suppliesNeeded === 'Kitchen items only') tags.push('Kitchen Items Only');
  if (spell.suppliesNeeded === 'Candles required') tags.push('Candles Required');
  if (spell.suppliesNeeded === 'Bath/water access') tags.push('Bath/Water Access');

  // SKILL-BASED TAGS
  if (spell.skillLevel) tags.push(spell.skillLevel);

  // VIBE-BASED TAGS
  if (spell.vibe) tags.push(spell.vibe);

  // CATEGORY-BASED INTENT TAGS (smart mapping)
  const categoryToIntent = {
    'Boundaries': ['Boundary Setting', 'Self-Permission'],
    'Cleansing/Release': ['Emotional Cleansing', 'Letting Go'],
    'Protection': ['Energy Protection'],
    'Grounding': ['Overwhelm Relief', 'Stress Release'],
    'Clarity/Focus': ['When Stuck'],
    'Energy/Motivation': ['Confidence Building'],
  };

  if (categoryToIntent[spell.category]) {
    tags.push(...categoryToIntent[spell.category]);
  }

  // SITUATION TAGS based on "whenToUse" text (keyword detection)
  const whenToUse = (spell.whenToUse || '').toLowerCase();
  
  if (whenToUse.includes('bed') || whenToUse.includes('sleep')) {
    tags.push('Before Bed');
  }
  if (whenToUse.includes('work') || whenToUse.includes('job')) {
    tags.push('After Work');
  }
  if (whenToUse.includes('conversation') || whenToUse.includes('interaction')) {
    tags.push('After Difficult Conversation');
  }
  if (whenToUse.includes('morning')) {
    tags.push('Morning Ritual');
  }
  if (whenToUse.includes('daily') || whenToUse.includes('every day')) {
    tags.push('Daily Practice');
  }
  if (whenToUse.includes('emergency') || whenToUse.includes('urgent') || whenToUse.includes('spiraling')) {
    tags.push('Emergency Use');
  }
  if (whenToUse.includes('anxiety') || whenToUse.includes('anxious')) {
    tags.push('Anxiety Relief');
  }
  if (whenToUse.includes('stress') || whenToUse.includes('overwhelm')) {
    tags.push('Stress Release', 'Overwhelm Relief');
  }
  if (whenToUse.includes('guilt')) {
    tags.push('Guilt Release');
  }
  if (whenToUse.includes('boundary') || whenToUse.includes('boundaries')) {
    tags.push('Boundary Setting');
  }

  // SEASONAL TAGS (keep existing ones)
  if (spell.seasonalTags && spell.seasonalTags.includes('Any Time')) {
    tags.push('Any Time');
  }

  // Remove duplicates
  return [...new Set(tags)];
};

// Main bulk update function
export const bulkUpdateSpellTags = async () => {
  try {
    console.log('Starting bulk tag update...');
    
    const spellsRef = collection(db, 'spells');
    const snapshot = await getDocs(spellsRef);
    
    let updateCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      try {
        const spell = docSnapshot.data();
        const spellId = docSnapshot.id;
        
        // Skip if spell already has tags
        if (spell.tags && spell.tags.length > 0) {
          console.log(`Skipping ${spell.title} - already has tags`);
          continue;
        }

        // Auto-assign tags
        const newTags = autoAssignTags(spell);
        
        // Update the spell
        await updateDoc(doc(db, 'spells', spellId), {
          tags: newTags
        });
        
        console.log(`✅ Updated ${spell.title} with tags:`, newTags);
        updateCount++;
        
      } catch (error) {
        console.error(`❌ Error updating spell ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ COMPLETE! Updated ${updateCount} spells`);
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} spells had errors`);
    }
    
    return { success: true, updated: updateCount, errors: errorCount };
    
  } catch (error) {
    console.error('Bulk update failed:', error);
    return { success: false, error: error.message };
  }
};