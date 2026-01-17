// export-firebase-spells.js
// Run with: node export-firebase-spells.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { createClient } = require("@supabase/supabase-js");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBVd0vbYSEiBRTglw3Ro4tYNQI5I5xbAbo",
  authDomain: "edge-altar-spell-library.firebaseapp.com",
  projectId: "edge-altar-spell-library",
  storageBucket: "edge-altar-spell-library.firebasestorage.app",
  messagingSenderId: "282383282540",
  appId: "1:282383282540:web:1f26f643f6abb539884349",
  measurementId: "G-X77C34S4WH"
};

// Supabase config
const SUPABASE_URL = "https://wmsekzsocvmfudmjakhu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2VrenNvY3ZtZnVkbWpha2h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5NTUwMywiZXhwIjoyMDg0MDcxNTAzfQ.9JoFjGUlp_iTAFZbO327uda4wAUqpLzCB6wnuGcUxKQ";

async function main() {
  console.log("🔥 Connecting to Firebase...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("📚 Fetching spells from Firebase...");
  const spellsRef = collection(db, "spells");
  const snapshot = await getDocs(spellsRef);

  const firebaseSpells = [];
  snapshot.forEach((doc) => {
    firebaseSpells.push({
      firebaseId: doc.id,
      ...doc.data()
    });
  });

  console.log(`✅ Found ${firebaseSpells.length} spells in Firebase`);

  // Connect to Supabase
  console.log("\n🗄️ Connecting to Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get existing Supabase spells to match by title
  const { data: supabaseSpells, error: fetchError } = await supabase
    .from("spells")
    .select("id, title, legacy_id");

  if (fetchError) {
    console.error("❌ Failed to fetch Supabase spells:", fetchError);
    return;
  }

  console.log(`✅ Found ${supabaseSpells.length} spells in Supabase`);

  // Create a map for matching
  const supabaseByTitle = {};
  const supabaseByLegacyId = {};
  supabaseSpells.forEach((s) => {
    supabaseByTitle[s.title?.toLowerCase().trim()] = s;
    if (s.legacy_id) {
      supabaseByLegacyId[s.legacy_id] = s;
    }
  });

  // Update each spell
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  console.log("\n🔄 Updating Supabase with Firebase data...\n");

  for (const fbSpell of firebaseSpells) {
    // Try to match by legacy_id first, then by title
    let supabaseSpell = supabaseByLegacyId[fbSpell.firebaseId];
    if (!supabaseSpell) {
      supabaseSpell = supabaseByTitle[fbSpell.title?.toLowerCase().trim()];
    }

    if (!supabaseSpell) {
      console.log(`⚠️ No match found for: ${fbSpell.title}`);
      notFound++;
      continue;
    }

    // Prepare update data - only include fields that have content
    const updateData = {};
    
    if (fbSpell.ingredients) updateData.ingredients = fbSpell.ingredients;
    if (fbSpell.instructions) updateData.instructions = fbSpell.instructions;
    if (fbSpell.spokenIntention) updateData.spoken_intention = fbSpell.spokenIntention;
    if (fbSpell.whyThisWorks) updateData.why_this_works = fbSpell.whyThisWorks;
    if (fbSpell.vibe) updateData.vibe = fbSpell.vibe;
    if (fbSpell.suppliesNeeded) updateData.supplies_needed = fbSpell.suppliesNeeded;
    if (fbSpell.tips) updateData.tips = fbSpell.tips;
    
    // Also store the Firebase ID as legacy_id if not already set
    if (!supabaseSpell.legacy_id) {
      updateData.legacy_id = fbSpell.firebaseId;
    }

    if (Object.keys(updateData).length === 0) {
      console.log(`⏭️ No new data for: ${fbSpell.title}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("spells")
      .update(updateData)
      .eq("id", supabaseSpell.id);

    if (updateError) {
      console.error(`❌ Error updating ${fbSpell.title}:`, updateError.message);
      errors++;
    } else {
      console.log(`✅ Updated: ${fbSpell.title}`);
      updated++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️ Not found in Supabase: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log("=".repeat(50));

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});