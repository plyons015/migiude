"use client";

import { hardReplace } from "@/lib/navigation/hard-navigate";
import { useEffect, useRef } from "react";

/** Legacy /listen URLs → dashboard (capture lives on home now). */
export default function ListenRedirectPage() {
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const search = window.location.search;
    hardReplace(`/dashboard${search}`);
  }, []);

  return null;
}
