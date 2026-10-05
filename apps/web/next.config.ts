import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The design system is shared source, not a built package.
  transpilePackages: ["@crackpay/brand"],
  async rewrites() {
    // Agents look for skills under either well-known path; there is one copy.
    return [{ source: "/.well-known/skills/:path*", destination: "/.well-known/agent-skills/:path*" }];
  },
  async headers() {
    return [
      {
        // No page may frame another site. The Mini App routes under /apps are the
        // exception, and get their policy per request from src/proxy.ts.
        source: "/((?!apps(?:/|$)).*)",
        headers: [{ key: "Content-Security-Policy", value: "frame-src 'self'" }],
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
