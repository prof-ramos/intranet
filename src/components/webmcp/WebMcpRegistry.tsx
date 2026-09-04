'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthRole } from '@/lib/auth/config';
import { buildSecretariaTools } from '@/lib/webmcp/build-tools';
import { listToolNamesFor, officialIdFromProfilePath } from '@/lib/webmcp/catalog';
import { registerTools } from '@/lib/webmcp/register';

interface WebMcpRegistryProps {
  role: AuthRole;
}

export function WebMcpRegistry({ role }: WebMcpRegistryProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const allowed = new Set(listToolNamesFor(role, pathname));
    const officialId = officialIdFromProfilePath(pathname);
    const tools = buildSecretariaTools(router, { officialId }).filter((tool) => allowed.has(tool.name));
    void registerTools(tools, { signal: controller.signal });
    return () => controller.abort();
  }, [pathname, role, router]);

  return null;
}
