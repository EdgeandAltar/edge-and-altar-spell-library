import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function Success() {
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState("checking"); // checking | premium | timeout | login_required
  const [seconds, setSeconds] = useState(0);
  const [debugMsg, setDebugMsg] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const sessionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("session_id");
  }, [location.search]);

  // Get access token on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setAccessToken(data.session.access_token);
          setUserId(data.session.user?.id);
        }
      } catch (err) {
        console.warn("[Success] Failed to get session:", err);
      }
    };
    getToken();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token || null);
      setUserId(session?.user?.id || null);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Wait until we've attempted to get the token
    if (accessToken === null && userId === null) {
      // Still initializing - give it a moment
      const timeout = setTimeout(() => {
        if (!accessToken && !userId) {
          setStatus("login_required");
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }

    if (!accessToken || !userId) {
      setStatus("login_required");
      return;
    }

    let alive = true;
    let timerId;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const checkAccessLevelOnce = async () => {
      try {
        // Use direct fetch instead of supabase client
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=access_level`,
          {
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.warn("[Success] Profile fetch failed:", response.status, errorText);
          return { loggedIn: true, premium: false, err: { message: errorText } };
        }

        const data = await response.json();
        
        if (!data || data.length === 0) {
          return { loggedIn: true, premium: false };
        }

        return { loggedIn: true, premium: data[0]?.access_level === "premium" };
      } catch (err) {
        console.warn("[Success] checkAccessLevel error:", err);
        return { loggedIn: true, premium: false, err };
      }
    };

    const run = async () => {
      try {
        // Timer for UI
        timerId = setInterval(() => {
          if (!alive) return;
          setSeconds((s) => s + 1);
        }, 1000);

        // Poll for up to 45s
        const started = Date.now();
        while (alive && Date.now() - started < 45000) {
          const result = await checkAccessLevelOnce();
          if (!alive) return;

          if (!result.loggedIn) {
            setStatus("login_required");
            return;
          }

          if (result.err) {
            console.warn("[Success] profiles check error:", result.err);
            setDebugMsg(result.err.message || "Profile read failed.");
          }

          if (result.premium) {
            setStatus("premium");
            await sleep(300);
            navigate("/library");
            return;
          }

          await sleep(1200);
        }

        if (alive) setStatus("timeout");
      } catch (err) {
        console.error("Success page error:", err);
        if (alive) {
          setDebugMsg(err?.message || "Unknown error");
          setStatus("timeout");
        }
      }
    };

    run();

    return () => {
      alive = false;
      if (timerId) clearInterval(timerId);
    };
  }, [accessToken, userId, navigate]);

  const copySessionId = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      alert("Copied checkout session id.");
    } catch {
      // no-op
    }
  };

  if (status === "checking") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <p style={{ color: "#7d6e57", fontSize: "18px" }}>
          Activating your premium access… (syncing with Stripe)
        </p>

        {!!sessionId && (
          <>
            <p style={{ color: "#bbb", fontSize: "12px", marginTop: "10px" }}>
              Checkout session: {sessionId.slice(0, 14)}…
            </p>
            <button
              onClick={copySessionId}
              style={{
                marginTop: "10px",
                padding: "10px 14px",
                background: "white",
                color: "#7D5E4F",
                border: "2px solid #7D5E4F",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              type="button"
            >
              Copy session id
            </button>
          </>
        )}

        <p style={{ color: "#999", fontSize: "14px", marginTop: "10px" }}>
          {seconds}s
        </p>
      </div>
    );
  }

  if (status === "login_required") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{ color: "#7D5E4F", marginBottom: "16px" }}>One last step</h1>
        <p style={{ color: "#7d6e57", fontSize: "18px", marginBottom: "18px" }}>
          Please sign in to finish unlocking your premium access.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "14px 22px",
              background: "#7D5E4F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            type="button"
          >
            Sign in
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              padding: "14px 22px",
              background: "white",
              color: "#7D5E4F",
              border: "2px solid #7D5E4F",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            type="button"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{ color: "#7D5E4F", marginBottom: "16px" }}>Almost there…</h1>
        <p style={{ color: "#7d6e57", fontSize: "18px", marginBottom: "18px" }}>
          Your payment went through, but your access hasn't synced yet.
        </p>
        <p style={{ color: "#999", fontSize: "14px", marginBottom: "18px" }}>
          This can take a minute if Stripe/webhooks are slow. Try refreshing, then go to the Library.
        </p>

        {!!sessionId && (
          <p style={{ color: "#bbb", fontSize: "12px", marginBottom: "10px" }}>
            Checkout session: {sessionId}
          </p>
        )}

        {!!debugMsg && (
          <p style={{ color: "#c0a48b", fontSize: "12px", marginBottom: "18px" }}>
            Debug: {debugMsg}
          </p>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "14px 22px",
              background: "#7D5E4F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            type="button"
          >
            Refresh
          </button>

          <button
            onClick={() => navigate("/library")}
            style={{
              padding: "14px 22px",
              background: "white",
              color: "#7D5E4F",
              border: "2px solid #7D5E4F",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            type="button"
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  // premium
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎉</div>
      <h1 style={{ color: "#7D5E4F", marginBottom: "16px" }}>Welcome to Premium!</h1>
      <p style={{ color: "#7d6e57", fontSize: "18px", marginBottom: "32px" }}>
        Your access is active. You have full access to all premium spells!
      </p>
      <button
        onClick={() => navigate("/library")}
        style={{
          padding: "16px 32px",
          background: "#7D5E4F",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: "pointer",
        }}
        type="button"
      >
        Browse Spell Library
      </button>
    </div>
  );
}

export default Success;