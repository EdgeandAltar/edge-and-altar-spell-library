import dotenv from "dotenv";
dotenv.config({ path: ".env.migration" });

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_EMAIL,
  FIREBASE_PASSWORD,
  FIRESTORE_SPELLS_COLLECTION = "spells",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");
if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID) throw new Error("Missing Firebase web config env vars");
if (!FIREBASE_EMAIL || !FIREBASE_PASSWORD) throw new Error("Missing FIREBASE_EMAIL / FIREBASE_PASSWORD");

const firebaseApp = initializeApp({
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
});

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const asTextArray = (val) => (Array.isArray(val) ? val.map(String).filter(Boolean) : []);
const asBool = (val) => Boolean(val);

const toISOStringMaybe = (val) => {
  if (val && typeof val.toDate === "function") return val.toDate().toISOString(); // Firestore Timestamp
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return null;
};

const mapSpell = (docId, data) => ({
  legacy_id: docId,
  title: data.title ?? "",
  when_to_use: data.whenToUse ?? data.when_to_use ?? null,
  category: data.category ?? null,
  time_required: data.timeRequired ?? data.time_required ?? null,
  skill_level: data.skillLevel ?? data.skill_level ?? null,
  seasonal_tags: asTextArray(data.seasonalTags ?? data.seasonal_tags),
  tags: asTextArray(data.tags),
  vibe: data.vibe ?? null,
supplies_needed: data.suppliesNeeded ?? data.supplies_needed ?? null,
ingredients: data.ingredients ?? null,
instructions: data.instructions ?? null,
why_this_works: data.whyThisWorks ?? data.why_this_works ?? null,
spoken_intention: data.spokenIntention ?? data.spoken_intention ?? null,
tips: data.tips ?? null,

  is_premium: asBool(data.isPremium ?? data.is_premium),
  image_url: data.imageUrl ?? data.image_url ?? null,
  created_at: toISOStringMaybe(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
});

async function upsertBatch(rows) {
  const { error } = await supabase.from("spells").upsert(rows, { onConflict: "legacy_id" });
  if (error) throw error;
}

async function main() {
  console.log("Signing into Firebase...");
  await signInWithEmailAndPassword(auth, FIREBASE_EMAIL, FIREBASE_PASSWORD);
  console.log("✅ Firebase auth OK");

  console.log(`Reading Firestore collection: ${FIRESTORE_SPELLS_COLLECTION} ...`);
  const snap = await getDocs(collection(db, FIRESTORE_SPELLS_COLLECTION));

  console.log(`Found ${snap.size} docs. Uploading to Supabase...`);

  const BATCH = 200;
  let batch = [];
  let count = 0;

  snap.forEach((doc) => {
    const row = mapSpell(doc.id, doc.data());
    if (!row.title) return;
    batch.push(row);
  });

  for (let i = 0; i < batch.length; i += BATCH) {
    const slice = batch.slice(i, i + BATCH);
    await upsertBatch(slice);
    count += slice.length;
    console.log(`Upserted ${count}/${batch.length}...`);
  }

  console.log(`✅ Done. Upserted ${count} spells into Supabase.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
