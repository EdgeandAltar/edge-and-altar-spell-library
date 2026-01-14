/**
 * Firebase Functions (v2) — Stripe checkout + webhook + backfill slugs
 * Rewritten cleanly so you can copy/paste the whole file.
 */

const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const cors = require("cors")({ origin: true });

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

// ---- Secrets (v2) ----
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const APP_URL = defineSecret("APP_URL");

// ---- Price IDs ----
// IMPORTANT: These must match the SAME Stripe mode as STRIPE_SECRET_KEY (test with sk_test_ uses test-mode price ids)
const MONTHLY_PRICE_ID = "price_1SpB9oPTSAVNLRQWKl3ddjPj";
const ANNUAL_PRICE_ID = "price_1SpB9oPTSAVNLRQWKwND4Tnh";

function getStripeClient() {
  const key = STRIPE_SECRET_KEY.value();
  return require("stripe")(key);
}

// ------------------------------------------------------------
// Callable: Create Checkout Session (keep if you want)
// ------------------------------------------------------------
exports.createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY, APP_URL] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const uid = request.auth.uid;
    const plan = request.data?.plan;

    if (!["monthly", "annual"].includes(plan)) {
      throw new HttpsError("invalid-argument", "plan must be 'monthly' or 'annual'.");
    }

    const priceId = plan === "monthly" ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID;

    const appUrl = APP_URL.value();
    if (!appUrl) {
      throw new HttpsError("failed-precondition", "APP_URL is not set.");
    }

    const stripe = getStripeClient();
    const email = request.auth.token?.email || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // map Stripe -> Firebase user
      client_reference_id: uid,
      metadata: { firebaseUID: uid, plan },
      customer_email: email,
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
    });

    return { url: session.url };
  }
);

// ------------------------------------------------------------
// HTTP: Create Checkout Session (EASIEST for debugging; use fetch())
// Frontend: POST with Authorization: Bearer <firebase id token>
// ------------------------------------------------------------
exports.createCheckoutSessionHttp = onRequest(
  { secrets: [STRIPE_SECRET_KEY, APP_URL], invoker: "public" },
  (req, res) => {
    cors(req, res, async () => {
      try {
        // Handle CORS preflight
        if (req.method === "OPTIONS") return res.status(204).send("");
        if (req.method !== "POST") return res.status(405).send("Method not allowed");

        const authHeader = req.headers.authorization || "";
        const match = authHeader.match(/^Bearer (.+)$/);
        if (!match) return res.status(401).send("Missing Authorization Bearer token");

        const idToken = match[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;
        const email = decoded.email || undefined;

        const { plan } = req.body || {};
        if (!["monthly", "annual"].includes(plan)) {
          return res.status(400).send("plan must be 'monthly' or 'annual'");
        }

        const priceId = plan === "monthly" ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID;

        const appUrl = APP_URL.value();
        if (!appUrl) return res.status(500).send("APP_URL is not set");

        const stripe = getStripeClient();

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          client_reference_id: uid,
          metadata: { firebaseUID: uid, plan },
          customer_email: email,
          success_url: `${appUrl}/success`,
          cancel_url: `${appUrl}/subscribe?canceled=true`,
        });

        return res.status(200).json({ url: session.url });
      } catch (err) {
        logger.error("createCheckoutSessionHttp error", err);
        return res.status(500).send("Failed to create checkout session");
      }
    });
  }
);

// ------------------------------------------------------------
// HTTP: Stripe Webhook
// ------------------------------------------------------------
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: "public" },
  (req, res) => {
    cors(req, res, async () => {
      const stripe = getStripeClient();
      const sig = req.headers["stripe-signature"];
      const webhookSecret = STRIPE_WEBHOOK_SECRET.value();

      if (!sig || !webhookSecret) {
        logger.error("Missing stripe-signature header or webhook secret");
        return res.status(400).send("Missing signature");
      }

      let event;
      try {
        // IMPORTANT: Use rawBody for signature verification
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
      } catch (err) {
        logger.error("Webhook signature verification failed", err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      logger.info("Stripe webhook received", {
        eventId: event.id,
        eventType: event.type,
      });

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            let session = event.data.object;

            let uid = session.client_reference_id || session.metadata?.firebaseUID;

            // Fallback: fetch full session if UID missing
            if (!uid && session.id) {
              logger.warn("UID missing on event session; fetching session from Stripe", {
                sessionId: session.id,
              });

              const fetched = await stripe.checkout.sessions.retrieve(session.id);
              session = fetched;
              uid = session.client_reference_id || session.metadata?.firebaseUID;
            }

            if (!uid) {
              logger.warn("checkout.session.completed: still missing uid after fetch", {
                sessionId: session?.id,
                hasMetadata: !!session?.metadata,
                clientRef: session?.client_reference_id || null,
              });
              break;
            }

            await admin.firestore().doc(`users/${uid}`).set(
              {
                subscriptionStatus: "premium",
                stripeCustomerId: session.customer || null,
                stripeSubscriptionId: session.subscription || null,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            logger.info("Upgraded user to premium", {
              uid,
              stripeCustomerId: session.customer || null,
              stripeSubscriptionId: session.subscription || null,
              sessionId: session.id,
            });

            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object;

            const snap = await admin
              .firestore()
              .collection("users")
              .where("stripeSubscriptionId", "==", subscription.id)
              .limit(1)
              .get();

            if (!snap.empty) {
              await snap.docs[0].ref.set(
                {
                  subscriptionStatus: "free",
                  subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

              logger.info("Downgraded user to free", {
                userDoc: snap.docs[0].id,
                stripeSubscriptionId: subscription.id,
              });
            } else {
              logger.warn("No user found for deleted subscription", {
                stripeSubscriptionId: subscription.id,
              });
            }

            break;
          }

          default:
            logger.info("Unhandled Stripe event type", { eventType: event.type });
            break;
        }

        return res.json({ received: true });
      } catch (err) {
        logger.error("Webhook handler error", err);
        return res.status(500).send("Webhook handler failed");
      }
    });
  }
);

// ------------------------------------------------------------
// Callable: One-time Backfill Spell Slugs (v2)
// ------------------------------------------------------------
exports.backfillSpellSlugs = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const slugify = (text = "") =>
    text
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const makeUniqueSlug = (base, usedSet) => {
    let slug = base;
    let i = 2;
    while (usedSet.has(slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    usedSet.add(slug);
    return slug;
  };

  const db = admin.firestore();
  const snap = await db.collection("spells").get();

  if (snap.empty) {
    return { updated: 0, message: "No spells found." };
  }

  const usedSlugs = new Set();
  snap.docs.forEach((doc) => {
    const existing = (doc.data()?.slug || "").toString().trim();
    if (existing) usedSlugs.add(existing);
  });

  const updates = [];
  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const title = (data.title || "").toString().trim();
    const currentSlug = (data.slug || "").toString().trim();

    if (!title || currentSlug) return;

    const base = slugify(title);
    if (!base) return;

    const uniqueSlug = makeUniqueSlug(base, usedSlugs);
    updates.push({ ref: doc.ref, slug: uniqueSlug });
  });

  if (updates.length === 0) {
    return { updated: 0, message: "All spells already had slugs." };
  }

  const chunkSize = 450;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((u) => {
      batch.set(
        u.ref,
        {
          slug: u.slug,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    updatedCount += chunk.length;
  }

  return {
    updated: updatedCount,
    message: `Backfilled slugs for ${updatedCount} spells.`,
  };
});
