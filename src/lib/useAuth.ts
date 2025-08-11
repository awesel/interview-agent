"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = auth?.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    }) || (() => {});
    return () => unsub();
  }, []);
  return { user, loading };
}
