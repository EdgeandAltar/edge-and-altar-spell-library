import "dotenv/config";
import admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_PROJECT_ID,
  FIRESTORE_SPELLS_COLLECTION = "spells",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.migration");
}
if (!FIREBASE_PROJECT_ID) {
  throw new Error("Missing FIREBASE_PROJECT_ID in .env.migration");
}

// --- Firebase Admin init ---
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
    // Uses GOOGLE_APPLICATION_CREDENTIALS automatically if set
  });
}
const firestore = admin.firestore();

// --- Supabase init (service role) ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const asTextArray = (val) => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  return [];
};

const asBool = (val) => Boolean(val);

const toISOStringMaybe = (val) => {
  // Firestore Timestamp objects often have toDate()
  if (val && typeof val.toDate === "function") return val.toDate().toISOString();
  // If already a JS Date
  if (val instanceof Date) return val.toISOString();
  // If string
  if (typeof val === "string") return val;
  return null;
};

// Map Firestore doc -> Supabase row (snake_case)
const mapSpell = (docId, data) => {
  // Your Firestore uses camelCase fields based on your React code
  return {
    legacy_id: docId,
    title: data.title ?? "",
    when_to_use: data.whenToUse ?? data.when_to_use ?? null,
    category: data.category ?? null,
    time_required: data.timeRequired ?? data.time_required ?? null,
    skill_level: data.skillLevel ?? data.skill_level ?? null,
    seasonal_tags: asTextArray(data.seasonalTags ?? data.seasonal_tags),
    tags: asTextArray(data.tags),
    is_premium: asBool(data.isPremium ?? data.is_premium),
    image_url: data.imageUrl ?? data.image_url ?? null,
    created_at: toISOStringMaybe(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
  };
};

async function upsertBatch(rows) {
  // Use upsert to allow safe reruns
  const { error } = await supabase
    .from("spells")
    .upsert(rows, { onConflict: "legacy_id" });

  if (error) throw error;
}

async function main() {
  console.log(`Reading Firestore collection: ${FIRESTORE_SPELLS_COLLECTION} ...`);
  const snap = await firestore.collection(FIRESTORE_SPELLS_COLLECTION).get();

  console.log(`Found ${snap.size} spell docs. Mapping + uploading to Supabase...`);

  const BATCH = 200;
  let batch = [];
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const row = mapSpell(doc.id, data);

    // Basic sanity check
    if (!row.title) {
      console.warn(`Skipping doc ${doc.id} because title is missing/empty`);
      continue;
    }

    batch.push(row);

    if (batch.length >= BATCH) {
      await upsertBatch(batch);
      count += batch.length;
      console.log(`Upserted ${count}/${snap.size}...`);
      batch = [];
    }
  }

  if (batch.length) {
    await upsertBatch(batch);
    count += batch.length;
  }

  console.log(`✅ Done. Upserted ${count} spells into Supabase.`);
  console.log("Next: verify in Supabase Table Editor → spells.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
