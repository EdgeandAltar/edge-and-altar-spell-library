import SunCalc from 'suncalc';

// Get current moon phase data
// Accepts optional date parameter to calculate moon phase for any date
export const getCurrentMoonPhase = (date = new Date()) => {
  const illumination = SunCalc.getMoonIllumination(date);
  
  // Phase is 0-1 where:
  // 0 = New Moon
  // 0.25 = First Quarter
  // 0.5 = Full Moon
  // 0.75 = Last Quarter
  const phase = illumination.phase;
  
  let phaseName = '';
  let phaseEmoji = '';
  let phaseDescription = '';
  
  if (phase < 0.0625 || phase >= 0.9375) {
    phaseName = 'New Moon';
    phaseEmoji = '🌑';
    phaseDescription = 'Perfect for new beginnings, setting intentions, and planting seeds for the future.';
  } else if (phase < 0.1875) {
    phaseName = 'Waxing Crescent';
    phaseEmoji = '🌒';
    phaseDescription = 'Time for growth, building momentum, and taking first steps toward your goals.';
  } else if (phase < 0.3125) {
    phaseName = 'First Quarter';
    phaseEmoji = '🌓';
    phaseDescription = 'Action time! Overcome obstacles, make decisions, and push forward with determination.';
  } else if (phase < 0.4375) {
    phaseName = 'Waxing Gibbous';
    phaseEmoji = '🌔';
    phaseDescription = 'Refine your plans, adjust your approach, and prepare for manifestation.';
  } else if (phase < 0.5625) {
    phaseName = 'Full Moon';
    phaseEmoji = '🌕';
    phaseDescription = 'Peak power! Celebrate achievements, perform powerful spells, and release what no longer serves.';
  } else if (phase < 0.6875) {
    phaseName = 'Waning Gibbous';
    phaseEmoji = '🌖';
    phaseDescription = 'Time for gratitude, sharing wisdom, and giving back to your community.';
  } else if (phase < 0.8125) {
    phaseName = 'Last Quarter';
    phaseEmoji = '🌗';
    phaseDescription = 'Release, let go, and break bad habits. Clear space for what\'s coming.';
  } else {
    phaseName = 'Waning Crescent';
    phaseEmoji = '🌘';
    phaseDescription = 'Rest, reflect, and prepare for renewal. Honor your need for stillness.';
  }
  
  return {
    phase,
    phaseName,
    phaseEmoji,
    phaseDescription,
    illumination: Math.round(illumination.fraction * 100), // Percentage illuminated
    date
  };
};

// Get next full moon date
export const getNextFullMoon = () => {
  const now = new Date();
  let checkDate = new Date(now);
  
  // Check next 45 days
  for (let i = 0; i < 45; i++) {
    checkDate.setDate(checkDate.getDate() + 1);
    const illumination = SunCalc.getMoonIllumination(checkDate);
    
    // Full moon is around phase 0.5
    if (illumination.phase >= 0.48 && illumination.phase <= 0.52) {
      return checkDate;
    }
  }
  
  return null;
};

// Get next new moon date
export const getNextNewMoon = () => {
  const now = new Date();
  let checkDate = new Date(now);
  
  // Check next 45 days
  for (let i = 0; i < 45; i++) {
    checkDate.setDate(checkDate.getDate() + 1);
    const illumination = SunCalc.getMoonIllumination(checkDate);
    
    // New moon is around phase 0 or 1
    if (illumination.phase < 0.02 || illumination.phase > 0.98) {
      return checkDate;
    }
  }
  
  return null;
};

// Check if spell is good for current moon phase
export const isGoodForCurrentPhase = (spell) => {
  const currentPhase = getCurrentMoonPhase();
  
  // If spell doesn't specify moon phase preferences, it's always good
  if (!spell.moonPhases || spell.moonPhases.length === 0) {
    return true;
  }
  
  // Check if current phase matches any of spell's preferred phases
  return spell.moonPhases.includes(currentPhase.phaseName);
};

// Days until next full moon
export const daysUntilFullMoon = () => {
  const nextFull = getNextFullMoon();
  if (!nextFull) return null;
  
  const now = new Date();
  const diffTime = Math.abs(nextFull - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Days until next new moon
export const daysUntilNewMoon = () => {
  const nextNew = getNextNewMoon();
  if (!nextNew) return null;
  
  const now = new Date();
  const diffTime = Math.abs(nextNew - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};