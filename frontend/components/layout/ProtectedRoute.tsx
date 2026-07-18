"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

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

    // Demo bypass: ?demo=1 skips the token check so judges can explore
    // the full app without manually authenticating. Frontend-only.
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      setAuthorized(true);
      return;
    }

    const token = localStorage.getItem("aethon_token");
    if (!token) {
      router.replace("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!mounted || !authorized) return null;

  return <>{children}</>;
}
