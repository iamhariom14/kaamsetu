import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvYIOlFGVNbRXtnzW6IEFXU9MK592T_Cw",
  authDomain: "coopgig.firebaseapp.com",
  projectId: "coopgig",
  storageBucket: "coopgig.firebasestorage.app",
  messagingSenderId: "177336792911",
  appId: "1:177336792911:web:fc9e62739b051bce37373a",
  measurementId: "G-YE623EN4FS",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore — used to persist worker profiles (see the "workers" collection)
// so registered/onboarded workers stay searchable across sessions.
export const db = getFirestore(app);

// Used for "Continue with Google" sign-in.
export const googleProvider = new GoogleAuthProvider();
