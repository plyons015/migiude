"use client";

import { APP_HOME_PATH } from "@/lib/navigation/go-home";
import { hardReplace } from "@/lib/navigation/hard-navigate";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Legacy /listen URLs → home (capture lives on dashboard). */
export default function ListenRedirectPage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const search = window.location.search;
    const target = `${APP_HOME_PATH}${search}`;

    if (isNativePlatform()) {
      hardReplace(target);
      return;
    }
    router.replace(target);
  }, [router]);

  return null;
}
