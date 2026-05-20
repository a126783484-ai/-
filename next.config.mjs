import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  outputFileTracingRoot: path.join(process.cwd()),
  typedRoutes: false
};

export default nextConfig;
