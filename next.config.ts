import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for production/Capacitor only. In dev, omit export so client
  // navigation does not spam failing `?_rsc=` requests (ERR_INSUFFICIENT_RESOURCES).
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      sharp: {
        browser: "./lib/stubs/empty.ts",
      },
      "onnxruntime-node": {
        browser: "./lib/stubs/empty.ts",
      },
    },
  },
};

export default nextConfig;
