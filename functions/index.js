/**
 * Firebase Functions (Gen 1) — Stripe ONE-TIME Checkout + Verify + Backfill Slugs
 * ✅ No public HTTP endpoints
 * ✅ No Cloud Run invoker/IAM headaches
 * ✅ Works cleanly with httpsCallable from React
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions"); // v1
const logger = require("firebase-functions/logger");

admin.initializeApp();

// --------------------
// Config / Secrets
// --------------------
// Use Secret Manager if you have it wired, otherwise use functions:config().
// To keep this copy/paste safe, we support BOTH:
//
// Preferred (Gen 2 style Secret Manager values exposed via environment):
//   process.env.STRIPE_SECRET_KEY
//   process.env.APP_URL
//
// Fallback (Gen 1 config):
//   firebase functions:config:set stripe.secret_key="..." app.url="..."
//   then deploy

function mustGetEnvOrConfig(keyPath, fallbackPath) {
  // keyPath example: "STRIPE_SECRET_KEY"
  const envVal = process.env[keyPath];
  if (envVal) return envVal;

  // fallbackPath example: ["stripe","secret_key"]
  let cfg = functions.config();
  for (const k of fallbackPath) cfg = cfg?.[k];
  if (cfg) return cfg;

  throw new Error(
    `Missing ${keyPath}. Set it as an env var OR via functions:config:set ${fallbackPath.join(
      "."
    )}=...`
  );
}

function getStripeClient() {
  const key = mustGetEnvOrConfig("STRIPE_SECRET_KEY", ["stripe", "secret_key"]);
  return require("stripe")(key);
}

// ---- One-time Price ID (set to your Stripe ONE-TIME price) ----
const LIFETIME_PRICE_ID = "price_REPLACE_ME";

// --------------------
// Callable: Create ONE-TIME Stripe Checkout Session
// --------------------
exports.createOneTimeCheckoutSession = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    const uid = context.auth.uid;
    const email = context.auth.token?.email || undefined;

    const appUrl = mustGetEnvOrConfig("APP_URL", ["app", "url"]);

    if (!LIFETIME_PRICE_ID || LIFETIME_PRICE_ID.includes("REPLACE_ME")) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Set LIFETIME_PRICE_ID in functions/index.js"
      );
    }

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: LIFETIME_PRICE_ID, quantity: 1 }],
      client_reference_id: uid,
      metadata: { firebaseUID: uid, purchaseType: "lifetime" },
      customer_email: email,
      allow_promotion_codes: true,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
    });

    return { url: session.url };
  });

// --------------------
// Callable: Verify Checkout Session + Grant Premium
// --------------------
exports.verifyOneTimeCheckoutSession = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in."
      );
    }

    const uid = context.auth.uid;
    const sessionId = data?.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "sessionId is required."
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUid =
      session.client_reference_id || session.metadata?.firebaseUID || null;

    if (sessionUid !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This checkout session does not belong to this user."
      );
    }

    if (session.payment_status !== "paid") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Payment not complete. payment_status=${session.payment_status}`
      );
    }

    await admin.firestore().doc(`users/${uid}`).set(
      {
        accessLevel: "premium",
        subscriptionStatus: "premium", // keep for UI compatibility
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent || null,
        premiumSource: "stripe_one_time",
      },
      { merge: true }
    );

    logger.info("Granted lifetime premium access", {
      uid,
      sessionId: session.id,
    });

    return { ok: true };
  });

// --------------------
// Callable: Backfill Spell Slugs
// --------------------
exports.backfillSpellSlugs = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required."
      );
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
    if (snap.empty) return { updated: 0, message: "No spells found." };

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
          { slug: u.slug, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
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
