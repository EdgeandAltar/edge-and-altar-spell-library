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

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const sig = event.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return { statusCode: 400, body: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" };
    }

    let stripeEvent;
    try {
      // Netlify provides event.body as a raw string -> perfect for signature verification
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    console.log("Stripe webhook:", stripeEvent.id, stripeEvent.type);

    const db = admin.firestore();

    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        let session = stripeEvent.data.object;

        let uid = session.client_reference_id || session.metadata?.firebaseUID;

        // fallback: fetch full session
        if (!uid && session.id) {
          session = await stripe.checkout.sessions.retrieve(session.id);
          uid = session.client_reference_id || session.metadata?.firebaseUID;
        }

        if (!uid) {
          console.warn("checkout.session.completed missing uid:", session?.id);
          break;
        }

        await db.doc(`users/${uid}`).set(
          {
            subscriptionStatus: "premium",
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log("Upgraded:", uid);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object;

        const snap = await db
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
          console.log("Downgraded:", snap.docs[0].id);
        } else {
          console.warn("No user found for deleted subscription:", subscription.id);
        }
        break;
      }

      default:
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return { statusCode: 500, body: err?.message || "Internal Server Error" };
  }
};
