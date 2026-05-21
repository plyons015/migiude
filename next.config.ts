import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → `out/` for Capacitor WebView (no Node server in the APK)
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
