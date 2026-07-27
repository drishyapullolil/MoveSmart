import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
