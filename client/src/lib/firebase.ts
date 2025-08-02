import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Set custom parameters to restrict to seedfinancial.io domain
googleProvider.setCustomParameters({
  hd: 'seedfinancial.io', // Restrict to seedfinancial.io domain
  prompt: 'select_account' // Allow account selection
});

// Authentication functions
export const signInWithGoogle = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // Check if email is from seedfinancial.io domain
      const email = result.user.email;
      if (!email?.endsWith('@seedfinancial.io')) {
        // Sign out if not from correct domain
        await signOut(auth);
        throw new Error('Only @seedfinancial.io email addresses are allowed');
      }
      return result;
    }
    return null;
  } catch (error: any) {
    console.error('Error handling redirect:', error);
    throw error;
  }
};

export const logoutUser = () => {
  return signOut(auth);
};