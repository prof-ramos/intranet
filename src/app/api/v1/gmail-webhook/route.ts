import { jsonError } from '@/lib/integrations/http';

export const dynamic = 'force-dynamic';

export const POST = (_request: Request) =>
  jsonError(410, 'deactivated', 'Gmail webhook está desativado. Reativar quando houver autenticação.');

export const GET = (_request: Request) =>
  jsonError(410, 'deactivated', 'Gmail webhook está desativado.');
