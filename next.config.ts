import type { NextConfig } from "next";

const ignoredDevArtifacts = [
  "**/.playwright-mcp/**",
  "**/.claude/**",
  "**/.impeccable/**",
];

const nextConfig: NextConfig = {
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
