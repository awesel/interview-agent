"use client";
import { useEffect, useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { app, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { DbUser } from "@/lib/types";

export default function LoginPage() {
  const [user, setUser] = useState<null | { displayName: string | null; email: string | null }>(null);
  useEffect(() => {
    const auth = getAuth(app);
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ displayName: u.displayName, email: u.email });
        // Upsert user in Firestore
        const data: DbUser = {
          uid: u.uid,
          email: u.email || "",
          displayName: u.displayName || "",
          photoURL: u.photoURL || undefined,
          provider: "google",
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        await setDoc(doc(db, "users", u.uid), data, { merge: true });
      } else {
        setUser(null);
      }
    });
  }, []);

  const handleSignIn = async () => {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleSignOut = async () => {
    const auth = getAuth(app);
    await signOut(auth);
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      {user ? (
        <div className="space-y-2">
          <div>Signed in as {user.displayName ?? user.email}</div>
          <button className="btn" onClick={handleSignOut}>Sign out</button>
        </div>
      ) : (
        <button className="btn" onClick={handleSignIn}>Sign in with Google</button>
      )}
    </main>
  );
}


