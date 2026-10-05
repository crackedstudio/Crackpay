import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The design system is shared source, not a built package.
  transpilePackages: ["@crackpay/brand"],
  async headers() {
    return [
      {
        // The marketing site frames nothing and is framed by nobody.
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-src 'none'; frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
