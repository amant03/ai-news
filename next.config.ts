import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  poweredByHeader: false,
  compress: true,
  // Ensure the JSON data store is bundled into serverless functions that read
  // it at request time (fs reads aren't auto-traced on Vercel).
  outputFileTracingIncludes: {
    "/api/news": ["./data/news.json"],
    "/api/status": ["./data/status.json"],
    "/api/models": ["./data/models-slim.json"],
  },
};

export default nextConfig;
