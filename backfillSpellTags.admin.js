// backfillSpellTags.admin.js
import admin from "firebase-admin";
import fs from "fs";

// ---- CONFIG ----
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json";
const DRY_RUN = false; // set true to preview without writing
// ----------------

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Missing ${SERVICE_ACCOUNT_PATH}. Put your service account JSON there.`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(SERVICE_ACCOUNT_PATH),
});

const db = admin.firestore();

async function backfillTags() {
  const spellsRef = db.collection("spells");
  const snapshot = await spellsRef.get();

  let updatedCount = 0;

  for (const spellDoc of snapshot.docs) {
    const data = spellDoc.data();

    const updates = {};
    if (!Array.isArray(data.tags)) updates.tags = [];
    if (!Array.isArray(data.seasonalTags)) updates.seasonalTags = [];

    if (Object.keys(updates).length > 0) {
      if (DRY_RUN) {
        console.log(`(dry-run) Would update ${spellDoc.id}:`, updates);
      } else {
        await spellDoc.ref.update(updates);
        console.log(`✅ Updated spell: ${spellDoc.id}`);
      }
      updatedCount++;
    }
  }

  console.log(`\n✅ Done. ${DRY_RUN ? "Would update" : "Updated"} ${updatedCount} spells.`);
}

backfillTags().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
