import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Side-effect import './src/lib/env' causes failures in Next.js 16 config compilation
// because Node.js cannot resolve .ts files in the compiled config.
// Validation still runs when src/lib/env is imported by app code at runtime.
if (!process.env.DATABASE_URL || !process.env.DATABASE_MIGRATION_URL) {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.DATABASE_MIGRATION_URL) missing.push('DATABASE_MIGRATION_URL');
  console.warn(`⚠ ${missing.join(' e ')} não definida(s) — app falhará em runtime se precisar de DB`);
}

import withBundleAnalyzer from '@next/bundle-analyzer';

const analyzeBundle = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isE2E = process.env.NEXT_E2E === '1';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: isE2E ? '.next-e2e' : '.next',
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tiptap/core',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@hello-pangea/dnd',
      '@novu/react',
      'pdf-lib',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default analyzeBundle(nextConfig);
