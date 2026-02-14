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
      // Use constructEventAsync for Deno compatibility
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Invalid signature: ${String(err)}`, { status: 400 });
    }

    console.log("Received event:", event.type);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- checkout.session.completed / async_payment_succeeded ---
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      console.log("Processing checkout for user:", userId, "session:", session.id, "mode:", session.mode);

      if (!userId) {
        console.error("No client_reference_id on session:", session.id);
        return new Response("Missing client_reference_id", { status: 200 });
      }

      if (session.mode === "subscription") {
        // Monthly subscription checkout
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Fetch the subscription to get current_period_end
        let periodEnd: string | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          } catch (err) {
            console.warn("Could not fetch subscription details:", err);
          }
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              access_level: "premium",
              subscription_type: "monthly",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_expires_at: periodEnd,
            },
            { onConflict: "id" }
          );

        if (error) {
          console.error("Failed to upsert profile (subscription):", error);
          return new Response("DB upsert failed", { status: 200 });
        }

        console.log(`✅ Monthly premium granted to user ${userId} via subscription ${subscriptionId}`);
      } else {
        // One-time payment (lifetime)
        const { error } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              access_level: "premium",
              subscription_type: "lifetime",
            },
            { onConflict: "id" }
          );

        if (error) {
          console.error("Failed to upsert profile (lifetime):", error);
          return new Response("DB upsert failed", { status: 200 });
        }

        console.log(`✅ Lifetime premium granted to user ${userId} via session ${session.id}`);
      }

      return new Response("ok", { status: 200 });
    }

    // --- customer.subscription.updated ---
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log("Subscription updated:", subscription.id, "status:", subscription.status, "customer:", customerId);

      // Look up user by stripe_customer_id
      const { data: profile, error: lookupErr } = await supabaseAdmin
        .from("profiles")
        .select("id, subscription_type")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (lookupErr || !profile) {
        console.error("Could not find profile for customer:", customerId, lookupErr);
        return new Response("Profile not found", { status: 200 });
      }

      // Don't downgrade lifetime users
      if (profile.subscription_type === "lifetime") {
        console.log("Skipping update for lifetime user:", profile.id);
        return new Response("ok", { status: 200 });
      }

      const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      if (subscription.status === "active" || subscription.status === "trialing") {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            access_level: "premium",
            subscription_expires_at: periodEnd,
            stripe_subscription_id: subscription.id,
          })
          .eq("id", profile.id);

        if (error) console.error("Failed to update profile (sub updated):", error);
        else console.log(`✅ Subscription updated for user ${profile.id}, expires ${periodEnd}`);
      } else if (subscription.status === "past_due") {
        // Keep premium for now; Stripe will retry payment
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_expires_at: periodEnd })
          .eq("id", profile.id);

        if (error) console.error("Failed to update expiry (past_due):", error);
        else console.log(`⚠️ Subscription past_due for user ${profile.id}, keeping premium`);
      }

      return new Response("ok", { status: 200 });
    }

    // --- customer.subscription.deleted ---
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log("Subscription deleted:", subscription.id, "customer:", customerId);

      const { data: profile, error: lookupErr } = await supabaseAdmin
        .from("profiles")
        .select("id, subscription_type")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (lookupErr || !profile) {
        console.error("Could not find profile for customer:", customerId, lookupErr);
        return new Response("Profile not found", { status: 200 });
      }

      // Don't downgrade lifetime users
      if (profile.subscription_type === "lifetime") {
        console.log("Skipping downgrade for lifetime user:", profile.id);
        return new Response("ok", { status: 200 });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          access_level: "free",
          subscription_type: null,
          stripe_subscription_id: null,
          subscription_expires_at: null,
        })
        .eq("id", profile.id);

      if (error) {
        console.error("Failed to downgrade profile:", error);
      } else {
        console.log(`⬇️ User ${profile.id} downgraded to free (subscription cancelled)`);
      }

      return new Response("ok", { status: 200 });
    }

    // --- invoice.payment_failed ---
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`⚠️ Payment failed for invoice ${invoice.id}, customer ${invoice.customer}. Stripe will retry.`);
      return new Response("ok", { status: 200 });
    }

    return new Response("ignored", { status: 200 });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response("Server error", { status: 500 });
  }
});
