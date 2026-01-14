import React, { useState, useEffect } from 'react';
import { getCurrentMoonPhase, daysUntilFullMoon, daysUntilNewMoon } from '../moonPhaseService';
import './MoonPhaseWidget.css';

function MoonPhaseWidget() {
  const [moonData, setMoonData] = useState(null);

  useEffect(() => {
    const data = getCurrentMoonPhase();
    const fullMoonDays = daysUntilFullMoon();
    const newMoonDays = daysUntilNewMoon();
    
    setMoonData({
      ...data,
      daysToFullMoon: fullMoonDays,
      daysToNewMoon: newMoonDays
    });
  }, []);

  if (!moonData) return null;

  return (
    <div className="moon-phase-widget">
      <div className="moon-display">
        <div className="moon-emoji">{moonData.phaseEmoji}</div>
        <div className="moon-info">
          <h3>{moonData.phaseName}</h3>
          <p className="illumination">{moonData.illumination}% illuminated</p>
        </div>
      </div>
      
      <p className="moon-description">{moonData.phaseDescription}</p>
      
      <div className="moon-countdown">
        {moonData.daysToFullMoon !== null && (
          <div className="countdown-item">
            <span className="countdown-number">{moonData.daysToFullMoon}</span>
            <span className="countdown-label">days to full moon</span>
          </div>
        )}
        {moonData.daysToNewMoon !== null && (
          <div className="countdown-item">
            <span className="countdown-number">{moonData.daysToNewMoon}</span>
            <span className="countdown-label">days to new moon</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MoonPhaseWidget;