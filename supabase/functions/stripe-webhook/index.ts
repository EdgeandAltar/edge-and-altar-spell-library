import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!stripeSecretKey || !webhookSecret || !serviceRoleKey || !supabaseUrl) {
      console.error("Missing env vars", {
        hasStripeSecret: !!stripeSecretKey,
        hasWebhookSecret: !!webhookSecret,
        hasServiceRole: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
      });
      return new Response("Missing env vars", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Read raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Invalid signature: ${String(err)}`, { status: 400 });
    }

    console.log("Received event:", event.type);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      console.log("Processing checkout for user:", userId, "session:", session.id);

      if (!userId) {
        console.error("No client_reference_id on session:", session.id);
        return new Response("Missing client_reference_id", { status: 200 });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // Upsert so missing profile row doesn't block upgrades
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: userId, access_level: "premium" },
          { onConflict: "id" }
        );

      if (error) {
        console.error("Failed to upsert profile:", error);
        return new Response("DB upsert failed", { status: 200 });
      }

      console.log(`✅ Premium granted to user ${userId} via session ${session.id}`);
      return new Response("ok", { status: 200 });
    }

    return new Response("ignored", { status: 200 });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
});