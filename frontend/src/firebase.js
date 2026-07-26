// Firebase configuration using Vite environment variables or defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForMoveSmartDemo123456",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "movesmart-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "movesmart-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "movesmart-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:abcdef1234567890",
};

// Initialize Firebase App via SDK
export const initFirebase = () => {
  if (typeof window !== "undefined" && window.firebase) {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }
    return window.firebase;
  }
  return null;
};

// Google Sign-In helper function using Firebase Auth
export const signInWithGoogleFirebase = async () => {
  try {
    const fb = initFirebase();
    if (fb && fb.auth) {
      const provider = new fb.auth.GoogleAuthProvider();
      const result = await fb.auth().signInWithPopup(provider);
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
  } catch (error) {
    console.warn("Firebase popup notice:", error.message);
  }

  return {
    success: false,
  };
};
