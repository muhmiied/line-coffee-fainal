import type { NextConfig } from "next";

const ignoredDevArtifacts = [
  "**/.playwright-mcp/**",
  "**/.claude/**",
  "**/.impeccable/**",
];

const nextConfig: NextConfig = {
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
