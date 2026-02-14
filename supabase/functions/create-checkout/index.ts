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
    const stripePriceId = Deno.env.get("STRIPE_PRICE_ID"); // lifetime price
    const stripeMonthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID"); // monthly price
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!stripeSecretKey || !stripePriceId || !stripeMonthlyPriceId || !serviceRoleKey || !supabaseUrl) {
      console.error("Missing env vars", {
        hasStripeSecret: !!stripeSecretKey,
        hasPriceId: !!stripePriceId,
        hasMonthlyPriceId: !!stripeMonthlyPriceId,
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
      console.error("Missing/invalid Authorization header");
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

    // Read origin and plan from body
    const body = await req.json().catch(() => ({}));
    const origin = typeof body?.origin === "string" ? body.origin : "http://localhost:3000";
    const plan = body?.plan === "monthly" ? "monthly" : "lifetime";

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log("Creating checkout for user:", user.id, "email:", user.email, "plan:", plan);

    const isMonthly = plan === "monthly";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isMonthly ? "subscription" : "payment",
      line_items: [{ price: isMonthly ? stripeMonthlyPriceId : stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
      metadata: { plan },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Created checkout session:", session.id, "client_reference_id:", user.id, "mode:", session.mode);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
