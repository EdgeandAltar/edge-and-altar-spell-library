import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">{text}</p>
    </div>
  );
}

export default LoadingSpinner;