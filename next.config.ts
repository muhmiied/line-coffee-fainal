import type { NextConfig } from "next";

const ignoredDevArtifacts = [
  "**/.playwright-mcp/**",
  "**/.claude/**",
  "**/.impeccable/**",
];

// Baseline security headers applied to every response. These are intentionally
// conservative (no strict CSP, which would risk breaking Next's inline runtime
// and Tailwind) — they cover the high-value, low-risk hardening: clickjacking,
// MIME sniffing, referrer leakage, and unused browser features.
const securityHeaders = [
  // Block the site from being embedded in a frame on another origin (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop the browser from MIME-sniffing a response away from its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin (not the full path) on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny powerful features the storefront never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Enforce HTTPS for a year (ignored by browsers over plain HTTP, e.g. localhost).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Allow next/image to load product images served from the public Supabase
    // Storage bucket (product-images). Scoped to public storage object URLs only.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        ignored: ignoredDevArtifacts,
      };
    }

    return config;
  },
};

export default nextConfig;
