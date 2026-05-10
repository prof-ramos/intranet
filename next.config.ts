import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import "@/lib/env";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
