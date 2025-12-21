import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize Stagehand and its dependencies for server-side usage
  // These packages use Node.js-specific APIs that can't be bundled
  serverExternalPackages: [
    "@browserbasehq/stagehand",
    "playwright",
    "playwright-core",
    "pino",
    "pino-pretty",
    "thread-stream",
  ],
};

export default nextConfig;
