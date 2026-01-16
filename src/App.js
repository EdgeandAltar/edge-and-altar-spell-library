import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import SpellLibrary from "./pages/SpellLibrary";
import SpellDetail from "./pages/SpellDetail";
import Subscribe from "./pages/Subscribe";
import Success from "./pages/Success";
import ManageSpells from "./pages/ManageSpells";
import EditSpell from "./pages/EditSpell";
import NotFound from "./pages/NotFound";
import SpellQuiz from "./pages/SpellQuiz";
import SpellJournal from "./pages/SpellJournal";
import Favorites from "./pages/Favorites";
import Account from "./pages/Account";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);         // Supabase user object
  const [isAdmin, setIsAdmin] = useState(false);  // profiles.is_admin
  const [loading, setLoading] = useState(true);

  const fetchAdminFlag = async (userId) => {
    if (!userId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    // If profile doesn't exist yet or RLS blocks it, treat as non-admin
    if (error) {
      console.warn("fetchAdminFlag error (defaulting to false):", error.message);
      return false;
    }

    return !!data?.is_admin;
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserId = null;

    // ✅ Failsafe: never hang on loading forever (helps after Stripe redirect)
    const loadingFailsafe = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    const applySession = async (session) => {
      const nextUser = session?.user ?? null;

      if (!isMounted) return;

      setUser(nextUser);
      setIsAdmin(false); // reset immediately so it doesn't "stick"

      if (!nextUser) {
        setLoading(false);
        return;
      }

      // Prevent race conditions if auth changes quickly
      const thisUserId = nextUser.id;
      lastUserId = thisUserId;

      const admin = await fetchAdminFlag(thisUserId);

      if (!isMounted) return;
      if (lastUserId !== thisUserId) return; // stale result

      setIsAdmin(admin);
      setLoading(false);
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Supabase getSession error:", error);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        await applySession(data?.session ?? null);
      } catch (err) {
        console.error("App init failed:", err);
        if (!isMounted) return;
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    init();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await applySession(session ?? null);
      } catch (err) {
        console.error("onAuthStateChange handler failed:", err);
        if (!isMounted) return;
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingFailsafe);
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // ✅ IMPORTANT: keep showing routes even if auth is still initializing,
  // so Stripe redirects to /success never get stuck behind the global loader.
  // We'll show a soft loader in Navigation if needed, but not block the whole app.
  return (
    <Router>
      <Navigation user={user} isAdmin={isAdmin} />

      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />

        {/* Stripe success should ALWAYS be reachable */}
        <Route path="/success" element={<Success />} />

        {/* Home */}
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />

        {/* ✅ Admin-only routes */}
        <Route
          path="/admin"
          element={user ? (isAdmin ? <Admin /> : <Navigate to="/" />) : <Navigate to="/login" />}
        />
        <Route
          path="/manage-spells"
          element={user ? (isAdmin ? <ManageSpells /> : <Navigate to="/" />) : <Navigate to="/login" />}
        />
        <Route
          path="/edit-spell/:id"
          element={user ? (isAdmin ? <EditSpell /> : <Navigate to="/" />) : <Navigate to="/login" />}
        />

        {/* Regular logged-in routes */}
        <Route path="/library" element={user ? <SpellLibrary /> : <Navigate to="/login" />} />
        <Route path="/spell/:id" element={user ? <SpellDetail /> : <Navigate to="/login" />} />
        <Route path="/subscribe" element={user ? <Subscribe /> : <Navigate to="/login" />} />
        <Route path="/quiz" element={user ? <SpellQuiz /> : <Navigate to="/login" />} />
        <Route path="/journal" element={user ? <SpellJournal /> : <Navigate to="/login" />} />
        <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/login" />} />
        <Route path="/account" element={user ? <Account /> : <Navigate to="/login" />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
