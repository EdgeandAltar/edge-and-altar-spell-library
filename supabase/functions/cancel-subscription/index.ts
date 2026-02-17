import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!stripeSecretKey || !serviceRoleKey || !supabaseUrl) {
      console.error("Missing env vars", {
        hasStripeSecret: !!stripeSecretKey,
        hasServiceRole: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
      });
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^bearer /i, "");

    // Validate the token and get user
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !userData?.user) {
      console.error("Auth validation failed:", userErr);
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;

    // Look up subscription info from profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("subscription_type, stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      console.error("Profile lookup failed:", profileErr);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.subscription_type === "lifetime") {
      return new Response(JSON.stringify({ error: "Lifetime subscriptions cannot be cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Cancel at end of billing period (user keeps access until then)
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    const cancelAt = new Date(subscription.current_period_end * 1000).toISOString();

    console.log(`✅ Subscription ${subscription.id} set to cancel at ${cancelAt} for user ${user.id}`);

    return new Response(JSON.stringify({ success: true, cancel_at: cancelAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cancel-subscription error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
