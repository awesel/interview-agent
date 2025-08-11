import { initializeApp, getApps } from "firebase/app";

import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
};

// Only initialize Firebase if we're in the browser or have real config
const shouldInitializeFirebase = typeof window !== "undefined" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const app = shouldInitializeFirebase && (getApps().length ? getApps()[0]! : initializeApp(firebaseConfig));

// Convenience singletons (safe to call multiple times)
export const auth = app ? getAuth(app) : null as any;
// Firestore client
export const db = app ? getFirestore(app) : null as any;

// Optional: connect to Firestore emulator when enabled
if (typeof window !== "undefined" && process.env.FIREBASE_EMULATORS && db) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    // eslint-disable-next-line no-console
    console.info("Connected to Firestore emulator at 127.0.0.1:8080");
  } catch {
    // ignore
  }
}

