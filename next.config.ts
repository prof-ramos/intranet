import path from "node:path";
import type { NextConfig } from "next";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["@libsql/client"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
