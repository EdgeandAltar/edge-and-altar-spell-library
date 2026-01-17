// src/App.js
import React, { useEffect, useRef, useState } from "react";
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

function InlineGateLoader({ label = "Checking access…" }) {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <p style={{ margin: 0 }}>{label}</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // used as safety, not blocking routes
  const [adminLoading, setAdminLoading] = useState(false);

  // ✅ Prevent repeated auth events from re-triggering admin loading forever
  const adminCheckInFlightRef = useRef(false);
  const lastAdminCheckedUserRef = useRef(null);

  const fetchAdminFlag = async (userId) => {
    if (!userId) return false;

    // hard timeout so adminLoading can't get stuck forever
    const timeoutMs = 6000;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("admin check timed out")), timeoutMs)
    );

    const request = supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    try {
      const { data, error } = await Promise.race([request, timeout]);

      if (error) {
        console.warn("[fetchAdminFlag] error (default false):", error.message);
        return false;
      }

      return Boolean(data?.is_admin);
    } catch (err) {
      console.warn("[fetchAdminFlag] timed out / failed:", err?.message || err);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserIdWarnOnly = null;

    const loadingFailsafe = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    const applySession = async (session) => {
      const nextUser = session?.user ?? null;
      if (!isMounted) return;

      setUser(nextUser);

      // No user → settle immediately
      if (!nextUser) {
        lastUserIdWarnOnly = null;
        adminCheckInFlightRef.current = false;
        lastAdminCheckedUserRef.current = null;
        setIsAdmin(false);
        setAdminLoading(false);
        setLoading(false);
        return;
      }

      const thisUserId = nextUser.id;
      lastUserIdWarnOnly = thisUserId;

      // ✅ If we're already checking admin for this same user, don't restart it.
      if (
        adminCheckInFlightRef.current &&
        lastAdminCheckedUserRef.current === thisUserId
      ) {
        // Ensure we aren't stuck showing the gate if something else already finished
        // (adminLoading should be managed by the in-flight check)
        return;
      }

      adminCheckInFlightRef.current = true;
      lastAdminCheckedUserRef.current = thisUserId;

      setAdminLoading(true);

      try {
        const admin = await fetchAdminFlag(thisUserId);

        if (!isMounted) return;

        // If a different user took over while we were waiting, stop — clear loading
        if (lastUserIdWarnOnly !== thisUserId) {
          return;
        }

        setIsAdmin(admin);
      } catch (err) {
        console.error("[applySession] admin check failed:", err);
        if (!isMounted) return;
        setIsAdmin(false);
      } finally {
        if (!isMounted) return;
        adminCheckInFlightRef.current = false;
        setAdminLoading(false);
        setLoading(false);
      }
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("[init] getSession error:", error);
          setUser(null);
          setIsAdmin(false);
          setAdminLoading(false);
          setLoading(false);
          return;
        }

        await applySession(data?.session ?? null);
      } catch (err) {
        console.error("[init] failed:", err);
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
        // Only truly clear state on sign out
        if (event === "SIGNED_OUT") {
          await applySession(null);
          return;
        }

        // Some environments briefly emit null sessions; reconcile via getSession
        if (!session) {
          const { data } = await supabase.auth.getSession();
          await applySession(data?.session ?? null);
          return;
        }

        await applySession(session);
      } catch (err) {
        console.error("[auth] handler failed:", err);
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

  return (
    <Router>
      <Navigation user={user} isAdmin={isAdmin} adminLoading={adminLoading} />

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />

        <Route path="/success" element={<Success />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />

        {/* Admin-only routes */}
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
