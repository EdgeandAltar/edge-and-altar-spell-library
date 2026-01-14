import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Create or get user document
export const createUserDocument = async (user) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  // If user document doesn't exist, create it
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      subscriptionStatus: 'free', // 'free' or 'premium'
      createdAt: new Date(),
    });
  }

  return userSnap.exists() ? userSnap.data() : { subscriptionStatus: 'free' };
};

// Get user's subscription status
export const getUserSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().subscriptionStatus || 'free';
    }
    return 'free';
  } catch (error) {
    console.error('Error getting subscription:', error);
    return 'free';
  }
};

// Update user to premium (call this after successful payment)
export const upgradeUserToPremium = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      subscriptionStatus: 'premium',
      upgradeDate: new Date(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error upgrading user:', error);
    return false;
  }
};