"use client";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ReactNode, useEffect } from "react";

const publicRoutes = new Set([
  "/login",
  "/interview", // candidate dynamic will also be handled minimally
]);

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic(pathname)) {
      router.replace("/login?next=" + encodeURIComponent(pathname));
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <div style={{padding:"3rem", textAlign:"center"}}>Loading...</div>;
  }
  if (!user && !isPublic(pathname)) return null; // redirect pending
  return <>{children}</>;
}

function isPublic(path: string) {
  if (publicRoutes.has(path)) return true;
  if (path.startsWith("/interview/")) return true; // shared candidate link
  return false;
}
