import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBropBFqlFHH2VK30yOFhSjgZk2hwDIhcw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "movesmart-c3c2b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "movesmart-c3c2b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "movesmart-c3c2b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "255078469903",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:255078469903:web:693e510fff445e306b6e7a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HGKJPL6L2D",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogleFirebase = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        googleId: user.uid,
        picture: user.photoURL,
      },
    };
  } catch (popupError) {
    console.warn("Popup failed, falling back to redirect:", popupError.code, popupError.message);

    // Only fall back to redirect for popup-specific failures
    const popupFailureCodes = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
    ];

    if (popupFailureCodes.includes(popupError.code)) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { success: false, redirecting: true };
      } catch (redirectErr) {
        return { success: false, error: redirectErr.message, code: redirectErr.code };
      }
    }

    return { success: false, error: popupError.message, code: popupError.code };
  }
};

export const checkFirebaseRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      return {
        success: true,
        user: {
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          googleId: user.uid,
          picture: user.photoURL,
        },
      };
    }
  } catch (err) {
    console.error("Redirect Auth Error:", err.code, err.message);
    return { success: false, error: err.message, code: err.code };
  }
  return { success: false };
};
