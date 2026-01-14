const admin = require("firebase-admin");
const Stripe = require("stripe");

function initFirebase() {
  if (admin.apps.length) return;

  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!svcJson) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(svcJson)),
  });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

exports.handler = async (event) => {
  try {
    initFirebase();
    const stripe = getStripe();

    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return { statusCode: 401, body: "Missing Authorization Bearer token" };

    const decoded = await admin.auth().verifyIdToken(match[1]);
    const uid = decoded.uid;
    const email = decoded.email || undefined;

    const body = event.body ? JSON.parse(event.body) : {};
    const plan = body.plan;

    if (!["monthly", "annual"].includes(plan)) {
      return { statusCode: 400, body: "plan must be 'monthly' or 'annual'" };
    }

    const monthly = process.env.STRIPE_PRICE_MONTHLY;
    const annual = process.env.STRIPE_PRICE_ANNUAL;
    if (!monthly || !annual) throw new Error("Missing STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL env vars");

    const priceId = plan === "monthly" ? monthly : annual;

    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("Missing APP_URL");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      metadata: { firebaseUID: uid, plan },
      customer_email: email,
      allow_promotion_codes: true,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: err?.message || "Internal Server Error",
    };
  }
};
