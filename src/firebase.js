import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVd0vbYSEiBRTglw3Ro4tYNQI5I5xbAbo",
  authDomain: "edge-altar-spell-library.firebaseapp.com",
  projectId: "edge-altar-spell-library",
  storageBucket: "edge-altar-spell-library.firebasestorage.app",
  messagingSenderId: "282383282540",
  appId: "1:282383282540:web:1f26f643f6abb539884349",
  measurementId: "G-X77C34S4WH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ ADD THIS
export const functions = getFunctions(app, "us-central1");
