import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi";
import "./Navigation.css";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function Navigation({ user, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [accessLevel, setAccessLevel] = useState("free");

  // Get session from localStorage
  const getSessionFromStorage = () => {
    try {
      const storageKey = Object.keys(localStorage).find(
        (k) => k.includes("sb-") && k.includes("-auth-token")
      );

      if (!storageKey) return null;

      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return {
        accessToken: parsed?.access_token,
        user: parsed?.user,
      };
    } catch (err) {
      console.warn("[Navigation] Failed to get session from storage:", err);
      return null;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setShowDropdown(false);
  }, [location.pathname]);

  // Fetch access level when user changes
  useEffect(() => {
    let alive = true;

    const loadAccess = async () => {
      if (!user?.id) {
        setAccessLevel("free");
        return;
      }

      const session = getSessionFromStorage();
      if (!session?.accessToken) {
        setAccessLevel("free");
        return;
      }

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=access_level`,
          {
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn("[Navigation] profiles fetch failed:", response.status);
          if (alive) setAccessLevel("free");
          return;
        }

        const data = await response.json();
        if (alive) {
          setAccessLevel(data?.[0]?.access_level === "premium" ? "premium" : "free");
        }
      } catch (err) {
        console.warn("[Navigation] loadAccess error:", err);
        if (alive) setAccessLevel("free");
      }
    };

    loadAccess();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const handleLogout = () => {
    try {
      setShowDropdown(false);

      // Clear the Supabase session from localStorage
      const storageKey = Object.keys(localStorage).find(
        (k) => k.includes("sb-") && k.includes("-auth-token")
      );
      
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      // Hard redirect to login page to fully reset app state
      window.location.assign("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      window.location.assign("/login");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate("/")}>
          <span className="brand-name">Edge & Altar</span>
          <span className="brand-tagline">Spell Library</span>
        </div>

        {user && (
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate("/library")} type="button">
              Browse Spells
            </button>

            <button className="nav-link" onClick={() => navigate("/quiz")} type="button">
              Find My Spell
            </button>

            {/* My Library Dropdown */}
            <div className="nav-dropdown" ref={dropdownRef}>
              <button
                className="nav-link dropdown-trigger"
                onClick={() => setShowDropdown((v) => !v)}
                type="button"
              >
                My Library{" "}
                <HiChevronDown className={`chevron ${showDropdown ? "open" : ""}`} />
              </button>

              {showDropdown && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/favorites");
                      setShowDropdown(false);
                    }}
                    type="button"
                  >
                    My Favorites
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/journal");
                      setShowDropdown(false);
                    }}
                    type="button"
                  >
                    My Journal
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/account");
                      setShowDropdown(false);
                    }}
                    type="button"
                  >
                    My Account
                  </button>
                </div>
              )}
            </div>

            {isAdmin && (
              <>
                <button
                  className="nav-link"
                  onClick={() => navigate("/manage-spells")}
                  type="button"
                >
                  Manage
                </button>
                <button className="nav-link" onClick={() => navigate("/admin")} type="button">
                  Add Spell
                </button>
              </>
            )}

            {/* Premium CTA: change label if already premium */}
            <button
              className="nav-link subscribe-link"
              onClick={() => navigate(accessLevel === "premium" ? "/library" : "/subscribe")}
              type="button"
            >
              {accessLevel === "premium" ? "Premium Active" : "Premium"}
            </button>

            <button className="nav-link logout-link" onClick={handleLogout} type="button">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;