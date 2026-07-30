"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/session";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (pathname === "/login") {
      setAuthorized(true);
      return;
    }

    // Every visitor must have a live token — no demo bypass. Tokens live in
    // sessionStorage by default (gone when the tab/browser closes, so login
    // is required every new session) and only persist in localStorage when
    // the user checked "Remember me" at login.
    const token = getToken();
    if (!token) {
      router.replace("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!mounted || !authorized) return null;

  return <>{children}</>;
}
