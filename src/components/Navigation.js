import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi";
import { supabase } from "../supabaseClient";
import "./Navigation.css";

function Navigation({ user, isAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Optional: show Premium vs Manage Membership based on access_level
  const [accessLevel, setAccessLevel] = useState("free"); // free | premium

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

      const { data, error } = await supabase
        .from("profiles")
        .select("access_level")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.warn("[Navigation] profiles read error:", error);
        setAccessLevel("free");
        return;
      }

      setAccessLevel(data?.access_level === "premium" ? "premium" : "free");
    };

    loadAccess();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      setShowDropdown(false);

      // Supabase sign out (kills session + refresh token)
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("Supabase signOut error:", error);

      // SPA navigate is fine, but hard redirect is a reliable fallback if state is stale
      navigate("/login", { replace: true });
      window.setTimeout(() => {
        if (window.location.pathname !== "/login") window.location.assign("/login");
      }, 250);
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