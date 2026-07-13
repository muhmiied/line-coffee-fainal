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

// Report-only CSP, staged ahead of enforcement. Scoped to what this app
// actually loads today: same-origin Next.js assets, self-hosted fonts
// (next/font/local + next/font/google both bundle at build time — no runtime
// fonts.gstatic.com/fonts.googleapis.com request is made), and the public
// Supabase project (REST API + Storage-hosted product images; this app has no
// Realtime/WebSocket usage, so no wss: entry is needed). No nonce
// infrastructure exists yet, so script-src keeps 'unsafe-inline' to avoid
// breaking Next's inline hydration/bootstrap scripts — this still blocks a
// classic <script src="https://evil.example/x.js"> injection (source
// restricted to 'self'), but does not stop inline-script injection. Closing
// that gap needs a per-request nonce threaded through the root layout and
// every next/script usage, which is a separate architecture change, not a
// one-line header addition — do not attempt it here. Live-tested against every
// public route with zero CSP console violations (see the 2026-07-13 CLAUDE.md
// change log entry for the full page list). Admin/authenticated flows and a
// full order submission were not exercised — test those and monitor real
// traffic before promoting this from Report-Only to an enforced policy.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
    ];
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
