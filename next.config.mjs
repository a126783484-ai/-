import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  outputFileTracingRoot: path.join(process.cwd()),
  typedRoutes: false
};

export default nextConfig;
