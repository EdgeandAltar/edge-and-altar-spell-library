// src/App.js
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

// Small inline loader used only for admin-gated routes
function InlineGateLoader({ label = "Checking access…" }) {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <p style={{ margin: 0 }}>{label}</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);            // Supabase user object
  const [isAdmin, setIsAdmin] = useState(false);     // profiles.is_admin
  const [loading, setLoading] = useState(true);      // auth init (non-blocking for routes)
  const [adminLoading, setAdminLoading] = useState(true); // admin flag fetch state

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

      // No user: immediately settle both auth + admin state
      if (!nextUser) {
        setIsAdmin(false);
        setAdminLoading(false);
        setLoading(false);
        return;
      }

      // We HAVE a user: keep previous isAdmin value while we re-check,
      // and gate admin-only routes with adminLoading to prevent "flash then redirect"
      setAdminLoading(true);

      const thisUserId = nextUser.id;
      lastUserId = thisUserId;

      const admin = await fetchAdminFlag(thisUserId);

      if (!isMounted) return;
      if (lastUserId !== thisUserId) return; // stale result

      setIsAdmin(admin);
      setAdminLoading(false);
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
          setAdminLoading(false);
          setLoading(false);
          return;
        }

        await applySession(data?.session ?? null);
      } catch (err) {
        console.error("App init failed:", err);
        if (!isMounted) return;
        setUser(null);
        setIsAdmin(false);
        setAdminLoading(false);
        setLoading(false);
      }
    };

    init();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
  try {
    // Only clear state on an actual sign-out event.
    if (event === "SIGNED_OUT") {
      await applySession(null);
      return;
    }

    // If Supabase sends a null session for other events, ignore it
    // (common during refresh/hydration on some clients).
    if (!session) return;

    await applySession(session);
  } catch (err) {
    console.error("onAuthStateChange handler failed:", err);
    if (!isMounted) return;
    setUser(null);
    setIsAdmin(false);
    setAdminLoading(false);
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
      {/* Pass adminLoading so nav doesn't flash/hide links unpredictably */}
<Navigation user={user} isAdmin={isAdmin} adminLoading={adminLoading} />

      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />

        {/* Stripe success should ALWAYS be reachable */}
        <Route path="/success" element={<Success />} />

        {/* Home */}
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />

        {/* ✅ Admin-only routes (gate on adminLoading to prevent redirect flicker) */}
        <Route
          path="/admin"
          element={
            user ? (
              adminLoading ? (
                <InlineGateLoader label="Checking admin access…" />
              ) : isAdmin ? (
                <Admin />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/manage-spells"
          element={
            user ? (
              adminLoading ? (
                <InlineGateLoader label="Checking admin access…" />
              ) : isAdmin ? (
                <ManageSpells />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/edit-spell/:id"
          element={
            user ? (
              adminLoading ? (
                <InlineGateLoader label="Checking admin access…" />
              ) : isAdmin ? (
                <EditSpell />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Regular logged-in routes */}
        <Route path="/library" element={user ? <SpellLibrary /> : <Navigate to="/login" replace />} />
        <Route path="/spell/:id" element={user ? <SpellDetail /> : <Navigate to="/login" replace />} />
        <Route path="/subscribe" element={user ? <Subscribe /> : <Navigate to="/login" replace />} />
        <Route path="/quiz" element={user ? <SpellQuiz /> : <Navigate to="/login" replace />} />
        <Route path="/journal" element={user ? <SpellJournal /> : <Navigate to="/login" replace />} />
        <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/login" replace />} />
        <Route path="/account" element={user ? <Account /> : <Navigate to="/login" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
