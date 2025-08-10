import { initializeApp, getApps } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// Convenience singletons (safe to call multiple times)
export const auth = getAuth(app);
// Firestore client
export const db = getFirestore(app);

// Optional: connect to Firestore emulator when enabled
if (typeof window !== "undefined" && process.env.FIREBASE_EMULATORS) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    // eslint-disable-next-line no-console
    console.info("Connected to Firestore emulator at 127.0.0.1:8080");
  } catch {
    // ignore
  }
}

