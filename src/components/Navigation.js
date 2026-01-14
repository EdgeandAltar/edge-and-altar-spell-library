import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { HiChevronDown } from 'react-icons/hi';
import './Navigation.css';

function Navigation({ user, isAdmin }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="brand-name">Edge & Altar</span>
          <span className="brand-tagline">Spell Library</span>
        </div>

        {user && (
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate('/library')}>
              Browse Spells
            </button>

            <button className="nav-link" onClick={() => navigate('/quiz')}>
              Find My Spell
            </button>

            {/* My Library Dropdown */}
            <div className="nav-dropdown">
              <button
                className="nav-link dropdown-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                My Library <HiChevronDown className={`chevron ${showDropdown ? 'open' : ''}`} />
              </button>

              {showDropdown && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/favorites');
                      setShowDropdown(false);
                    }}
                  >
                    My Favorites
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/journal');
                      setShowDropdown(false);
                    }}
                  >
                    My Journal
                  </button>

                  {/* ✅ Pantry removed from navigation for now */}
                  {/*
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/pantry');
                      setShowDropdown(false);
                    }}
                  >
                    My Pantry
                  </button>
                  */}
                </div>
              )}
            </div>

            {isAdmin && (
              <>
                <button className="nav-link" onClick={() => navigate('/manage-spells')}>
                  Manage
                </button>
                <button className="nav-link" onClick={() => navigate('/admin')}>
                  Add Spell
                </button>
              </>
            )}

            <button className="nav-link subscribe-link" onClick={() => navigate('/subscribe')}>
              Premium
            </button>
            <button className="nav-link logout-link" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;
