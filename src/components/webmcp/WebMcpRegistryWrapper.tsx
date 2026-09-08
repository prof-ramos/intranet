'use client';

import dynamic from 'next/dynamic';
import type { AuthRole } from '@/lib/auth/config';

const WebMcpRegistry = dynamic(() => import('./WebMcpRegistry').then((mod) => mod.WebMcpRegistry), {
  ssr: false,
});

interface WebMcpRegistryWrapperProps {
  role: AuthRole;
}

export function WebMcpRegistryWrapper({ role }: WebMcpRegistryWrapperProps) {
  return <WebMcpRegistry role={role} />;
}
