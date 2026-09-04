import type { AuthRole } from '@/lib/auth/config';
import type { WebMcpCatalogEntry } from './types';

export const WEBMCP_CATALOG: readonly WebMcpCatalogEntry[] = [
  { name: 'global-search', roles: 'any', scope: 'app' },
  { name: 'search-officials', roles: 'any', scope: 'app' },
  { name: 'get-official-profile', roles: 'any', scope: 'app' },
  { name: 'open-officials-list', roles: 'any', scope: 'app' },
  { name: 'open-official-profile', roles: 'any', scope: 'app' },
  { name: 'start-create-official', roles: ['admin', 'secretaria'], scope: 'app' },
  { name: 'start-edit-official', roles: 'any', scope: 'app' },
  { name: 'list-official-letters', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  { name: 'get-official-letter', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  {
    name: 'start-create-official-letter',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'app',
  },
  { name: 'start-edit-official-letter', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  {
    name: 'generate-official-letter-draft',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'app',
  },
  {
    name: 'send-official-letter-for-signature',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'app',
  },
  { name: 'cancel-official-letter', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  { name: 'count-mailing-audience', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  { name: 'export-gmail-contacts-csv', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  { name: 'generate-institutional-email', roles: ['admin', 'secretaria'], scope: 'app' },
  { name: 'open-mala-direta', roles: ['admin', 'diretoria', 'secretaria'], scope: 'app' },
  { name: 'open-email-generator', roles: ['admin', 'secretaria'], scope: 'app' },
  { name: 'add-dependent', roles: ['admin', 'diretoria', 'secretaria'], scope: 'official-profile' },
  { name: 'edit-dependent', roles: ['admin', 'diretoria', 'secretaria'], scope: 'official-profile' },
  {
    name: 'remove-dependent',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'official-profile',
  },
  {
    name: 'add-health-agreement',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'official-profile',
  },
  {
    name: 'edit-health-agreement',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'official-profile',
  },
  {
    name: 'remove-health-agreement',
    roles: ['admin', 'diretoria', 'secretaria'],
    scope: 'official-profile',
  },
];

export function isOfficialProfilePath(pathname: string): boolean {
  return /^\/app\/associados\/\d+$/.test(pathname);
}

export function officialIdFromProfilePath(pathname: string): number | null {
  const match = pathname.match(/^\/app\/associados\/(\d+)$/);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function roleAllows(entry: WebMcpCatalogEntry, role: AuthRole): boolean {
  return entry.roles === 'any' || entry.roles.includes(role);
}

function scopeAllows(entry: WebMcpCatalogEntry, pathname: string): boolean {
  if (entry.scope === 'app') return true;
  return isOfficialProfilePath(pathname);
}

export function listToolNamesFor(role: AuthRole, pathname: string): string[] {
  return WEBMCP_CATALOG.filter(
    (entry) => roleAllows(entry, role) && scopeAllows(entry, pathname),
  ).map((entry) => entry.name);
}
