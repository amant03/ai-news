import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry only wraps the build when a DSN is configured — otherwise the app
// builds and runs exactly as before (free-tier friendly, no-op locally).
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      telemetry: false,
      sourcemaps: { disable: true },
    })
  : nextConfig;
