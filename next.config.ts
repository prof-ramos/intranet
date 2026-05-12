import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import '@/lib/env';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isE2E = process.env.NEXT_E2E === '1';

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: isE2E ? '.next-e2e' : '.next',
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: [],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
