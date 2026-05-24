import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for production/Capacitor only. In dev, omit export so client
  // navigation does not spam failing `?_rsc=` requests (ERR_INSUFFICIENT_RESOURCES).
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
