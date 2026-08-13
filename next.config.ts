import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
