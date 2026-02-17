import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Account.css";

const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTU1MDMsImV4cCI6MjA4NDA3MTUwM30.1xx9jyZdByOKNphMFHJ6CVOYRgv2fiH8fw-Gj2p4rlQ";

function Account() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledAt, setCancelledAt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

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
        console.warn("[Account] Failed to get session from storage:", err);
        return null;
      }
    };

    const fetchProfileDirect = async (token, userId) => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,email,access_level,is_admin,created_at,subscription_type,stripe_subscription_id`,
          {
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn("[Account] profiles fetch failed:", response.status);
          return null;
        }

        const data = await response.json();
        return data?.[0] || null;
      } catch (err) {
        console.warn("[Account] fetchProfile error:", err);
        return null;
      }
    };

    const loadProfile = async () => {
      setLoading(true);

      try {
        const session = getSessionFromStorage();

        if (!session?.accessToken || !session?.user) {
          if (alive) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const user = session.user;
        const data = await fetchProfileDirect(session.accessToken, user.id);

        if (alive) {
          setProfile({
            id: user.id,
            email: user.email,
            accessLevel: data?.access_level || "free",
            isAdmin: data?.is_admin || false,
            createdAt: data?.created_at || user.created_at,
            subscriptionType: data?.subscription_type || null,
            stripeSubscriptionId: data?.stripe_subscription_id || null,
          });
        }
      } catch (err) {
        console.error("[Account] load error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You'll keep premium access until the end of your current billing period."
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const session = (() => {
        const storageKey = Object.keys(localStorage).find(
          (k) => k.includes("sb-") && k.includes("-auth-token")
        );
        if (!storageKey) return null;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.access_token;
      })();

      if (!session) {
        alert("Please log in again to cancel your subscription.");
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to cancel subscription. Please try again.");
        return;
      }

      setCancelledAt(data.cancel_at);
    } catch (err) {
      console.error("[Account] cancel error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="account-container">
        <p>Loading account...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="account-container">
        <p>Please log in to view your account.</p>
        <button onClick={() => navigate("/login")} className="primary-btn">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div className="account-card">
        <h1>My Account</h1>

        <div className="account-section">
          <label>Email</label>
          <p className="account-value">{profile.email}</p>
        </div>

        <div className="account-section">
          <label>Membership</label>
          <div className="membership-status">
            <span className={`status-badge ${profile.accessLevel}`}>
              {profile.accessLevel === "premium" ? "✨ Premium" : "Free"}
            </span>
            {profile.isAdmin && <span className="status-badge admin">Admin</span>}
          </div>
        </div>

        <div className="account-section">
          <label>Member Since</label>
          <p className="account-value">{formatDate(profile.createdAt)}</p>
        </div>

        {profile.accessLevel === "free" && (
          <div className="upgrade-section">
            <p>Unlock all spells with lifetime Premium access.</p>
            <button onClick={() => navigate("/subscribe")} className="upgrade-btn">
              Upgrade to Premium
            </button>
          </div>
        )}

        {profile.accessLevel === "premium" && profile.subscriptionType === "monthly" && (
          <div className="premium-section">
            {cancelledAt ? (
              <div className="cancel-info">
                <p>Your subscription has been cancelled.</p>
                <p>You'll keep premium access until <strong>{formatDate(cancelledAt)}</strong>.</p>
              </div>
            ) : (
              <>
                <p>You have an active monthly subscription.</p>
                <button
                  onClick={handleCancelSubscription}
                  className="cancel-btn"
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Cancel Subscription"}
                </button>
              </>
            )}
          </div>
        )}

        {profile.accessLevel === "premium" && profile.subscriptionType !== "monthly" && (
          <div className="premium-section">
            <p>You have lifetime access to all spells!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Account;