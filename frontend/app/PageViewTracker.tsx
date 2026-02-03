"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "../lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `${pathname}${search ? `?${search}` : ""}`;
    trackPageView(pathname, url);
  }, [pathname, search]);

  return null;
}
