import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// 🔐 Same config you already use
const firebaseConfig = {
  apiKey: "AIzaSyBVd0vbYSEiBRTglw3Ro4tYNQI5I5xbAbo",
  authDomain: "edge-altar-spell-library.firebaseapp.com",
  projectId: "edge-altar-spell-library",
  storageBucket: "edge-altar-spell-library.firebasestorage.app",
  messagingSenderId: "282383282540",
  appId: "1:282383282540:web:1f26f643f6abb539884349",
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfillTags() {
  const spellsRef = collection(db, 'spells');
  const snapshot = await getDocs(spellsRef);

  let updatedCount = 0;

  for (const spellDoc of snapshot.docs) {
    const data = spellDoc.data();
    const updates = {};

    if (!Array.isArray(data.tags)) {
      updates.tags = [];
    }

    if (!Array.isArray(data.seasonalTags)) {
      updates.seasonalTags = [];
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'spells', spellDoc.id), updates);
      updatedCount++;
      console.log(`Updated spell: ${spellDoc.id}`);
    }
  }

  console.log(`✅ Done. Updated ${updatedCount} spells.`);
}

backfillTags().catch(console.error);
