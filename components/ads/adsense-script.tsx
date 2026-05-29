"use client";

import { ADSENSE_SCRIPT_SRC } from "@/lib/ads/adsense";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useEffect } from "react";

/** Load AdSense on web only — skip in the Capacitor WebView. */
export function AdsenseScript() {
  useEffect(() => {
    if (isNativePlatform()) return;
    if (document.querySelector('script[data-ude-adsense="true"]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = ADSENSE_SCRIPT_SRC;
    script.crossOrigin = "anonymous";
    script.dataset.udeAdsense = "true";
    document.head.appendChild(script);
  }, []);

  return null;
}
