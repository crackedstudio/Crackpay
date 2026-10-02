import type { NextConfig } from "next";
import { miniAppOrigins } from "./src/config/miniapps";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // Only registered Mini Apps can be framed.
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src 'self' ${miniAppOrigins().join(" ")}`,
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          // Always revalidate so a new service worker is picked up immediately.
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
