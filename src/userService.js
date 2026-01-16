import { supabase } from "./supabaseClient";

/**
 * ✅ Create or get user profile row in Supabase
 * Mirrors your old Firebase "users" doc behavior.
 *
 * Supabase table: profiles
 * Key: id = auth.users.id
 * Columns:
 *  - access_level ('free' or 'premium')
 *  - email
 *  - created_at (optional)
 */
export const createUserDocument = async (user) => {
  if (!user?.id) return { subscriptionStatus: "free" };

  try {
    // ✅ Ensure profile exists (UPSERT = safe to call repeatedly)
    const payload = {
      id: user.id,
      email: user.email ?? null,
      access_level: "free", // default, won't overwrite premium
    };

    // We do NOT want to downgrade premium users accidentally.
    // So: do a read first; only insert if missing.
    const { data: existing, error: readErr } = await supabase
      .from("profiles")
      .select("access_level,email")
      .eq("id", user.id)
      .maybeSingle();

    if (readErr) {
      console.warn("[userService] createUserDocument read error:", readErr);
    }

    if (!existing) {
      const { error: insertErr } = await supabase.from("profiles").insert(payload);
      if (insertErr) {
        console.warn("[userService] createUserDocument insert error:", insertErr);
      }
      return { subscriptionStatus: "free" };
    }

    return {
      subscriptionStatus: existing?.access_level === "premium" ? "premium" : "free",
    };
  } catch (err) {
    console.error("[userService] createUserDocument failed:", err);
    return { subscriptionStatus: "free" };
  }
};

/**
 * ✅ Get user's subscription status (for gating premium spells)
 * Returns: 'free' | 'premium'
 */
export const getUserSubscription = async (userId) => {
  if (!userId) return "free";

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("access_level")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[userService] getUserSubscription error:", error);
      return "free";
    }

    return data?.access_level === "premium" ? "premium" : "free";
  } catch (err) {
    console.error("[userService] getUserSubscription failed:", err);
    return "free";
  }
};

/**
 * ✅ Upgrade user to premium
 * NOTE: In your real flow, Stripe webhook should handle this automatically.
 * But keeping this function helps you manually set premium for testing or admin actions.
 */
export const upgradeUserToPremium = async (userId) => {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          access_level: "premium",
        },
        { onConflict: "id" }
      );

    if (error) {
      console.warn("[userService] upgradeUserToPremium error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[userService] upgradeUserToPremium failed:", err);
    return false;
  }
};
