import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>Edge & Altar</h3>
          <p>Practical magic for real life</p>
        </div>

        <div className="footer-links">
          <div className="footer-section">
            <h4>Library</h4>
            <button onClick={() => navigate('/library')}>Browse Spells</button>
            <button onClick={() => navigate('/subscribe')}>Premium</button>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <a href="mailto:wendy@edgeandaltar.com">Contact</a>
            <a href="#">Help Center</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Edge & Altar. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;