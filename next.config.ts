import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  poweredByHeader: false,
  compress: true,
  // Ensure the JSON data store is bundled into serverless functions that read
  // it at request time (fs reads aren't auto-traced on Vercel).
  outputFileTracingIncludes: {
    "/": ["./data/news.json", "./data/status.json", "./data/aa-models.json"],
    "/models/[slug]": ["./data/models-slim.json", "./data/aa-models.json"],
    "/models/[slug]/vs/[slug2]": ["./data/models-slim.json"],
    "/api/news": ["./data/news.json"],
    "/api/status": ["./data/status.json"],
    "/api/models": ["./data/models-slim.json"],
    "/api/models/catalog": ["./data/models-slim.json", "./data/aa-models.json"],
    "/api/changelog": ["./data/news.json", "./data/status.json"],
    "/sitemap.xml": ["./data/models-slim.json"],
  },
  outputFileTracingExcludes: {
    "*": ["./data/models.json"],
  },
};

// No paid APM/SDK wrappers anywhere in this project — the config is exported
// directly so builds stay dependency-free and reproducible.
export default nextConfig;
