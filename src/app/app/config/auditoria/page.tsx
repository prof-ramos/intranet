import { requireRole } from '@/lib/auth/authorization';
import {
  encodeAuditCursor,
  parseAuditCursor,
  parseAuditSearchParams,
} from '@/lib/audit/search-params';
import { db } from '@/lib/db';
import { auditLogs, type AuditLog } from '@/lib/db/schema/audit';
import { admins } from '@/lib/db/schema/admins';
import { desc, eq, and, gte, lt, ilike, count, sql } from 'drizzle-orm';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import type { SQL } from 'drizzle-orm';
import { auditEntityBadgeColors, focusRingClass, textFaint } from '@/lib/ui/tokens';
import { PageHeader } from '@/components/PageHeader';

const PAGE_SIZE = 50;

const entityTypeLabels: Record<string, string> = {
  associate: 'Associado',
  admin: 'Usuário',
  activity: 'Atividade',
  assignment: 'Lotação',
  legal_consultation: 'Consulta jurídica',
  legal_process: 'Processo jurídico',
  finance: 'Financeiro',
  monthly_payment: 'Mensalidade',
  official_letter: 'Ofício',
  domain_event: 'Evento de domínio',
  webhook_subscription: 'Webhook',
};

const dtf = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    cursor?: string;
    tipo?: string;
    q?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  await requireRole(['admin', 'diretoria']);

  const { cursor, entityType, q, de, ate } = parseAuditSearchParams(await searchParams);
  const keyset = parseAuditCursor(cursor);

  const filters: SQL[] = [];

  if (entityType && Object.prototype.hasOwnProperty.call(entityTypeLabels, entityType)) {
    filters.push(eq(auditLogs.entityType, entityType as AuditLog['entityType']));
  }
  if (q) {
    filters.push(ilike(auditLogs.action, `%${escapeLikePattern(q)}%`));
  }
  if (de) {
    const d = new Date(`${de}T00:00:00-03:00`);
    if (!isNaN(d.getTime())) filters.push(gte(auditLogs.createdAt, d));
  }
  if (ate) {
    const d = new Date(`${ate}T00:00:00-03:00`);
    if (!isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + 1);
      filters.push(lt(auditLogs.createdAt, d));
    }
  }

  if (keyset) {
    // Keyset: (created_at, id) lexicographically older than the cursor in DESC order.
    filters.push(
      sql`(${auditLogs.createdAt}, ${auditLogs.id}) < (${keyset.createdAt}, ${keyset.id})`,
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  // Exact count only on the first page (no cursor). Deep OFFSET counts are avoided.
  const total = keyset
    ? null
    : ((await db.select({ total: count() }).from(auditLogs).where(where))[0]?.total ?? 0);

  const fetched = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      actorName: admins.name,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(admins, eq(auditLogs.performedBy, admins.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = fetched.length > PAGE_SIZE;
  const rows = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;
  const nextCursor =
    hasMore && rows.length > 0
      ? encodeAuditCursor(rows[rows.length - 1].createdAt, rows[rows.length - 1].id)
      : null;

  function listUrl(next?: { cursor?: string | null }) {
    const sp = new URLSearchParams();
    if (entityType) sp.set('tipo', entityType);
    if (q) sp.set('q', q);
    if (de) sp.set('de', de);
    if (ate) sp.set('ate', ate);
    if (next?.cursor) sp.set('cursor', next.cursor);
    const qs = sp.toString();
    return `/app/config/auditoria${qs ? `?${qs}` : ''}`;
  }

  const hasFilters = q || entityType || de || ate;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <PageHeader
        eyebrow="Configurações · Auditoria"
        title="Auditoria"
        backHref="/app/config"
        backLabel="Voltar para configurações"
      />

      <form method="GET" action="/app/config/auditoria" className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Filtrar por ação…"
          aria-label="Filtrar por ação"
          className={`h-9 w-[200px] rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-sm ${focusRingClass}`}
        />
        <select
          name="tipo"
          defaultValue={entityType}
          aria-label="Tipo de entidade"
          className={`h-9 w-[190px] rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-sm ${focusRingClass}`}
        >
          <option value="">Todos os tipos</option>
          {Object.entries(entityTypeLabels).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="de"
          type="date"
          defaultValue={de}
          aria-label="Data inicial"
          className={`h-9 rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-sm ${focusRingClass}`}
        />
        <input
          name="ate"
          type="date"
          defaultValue={ate}
          aria-label="Data final"
          className={`h-9 rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-sm ${focusRingClass}`}
        />
        <button
          type="submit"
          className={`h-9 rounded-[6px] bg-[#040920] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
        >
          Filtrar
        </button>
        {hasFilters && (
          <a
            href="/app/config/auditoria"
            className={`flex h-9 items-center rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-4 text-sm text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
          >
            Limpar
          </a>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-[10px] border border-[rgba(4,9,32,0.05)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(4,9,32,0.06)] bg-[rgba(13,31,60,0.02)]">
              <th className="px-5 py-3 text-left font-semibold whitespace-nowrap text-[#040920]">
                Data / Hora
              </th>
              <th className="px-5 py-3 text-left font-semibold text-[#040920]">Ator</th>
              <th className="px-5 py-3 text-left font-semibold text-[#040920]">Ação</th>
              <th className="px-5 py-3 text-left font-semibold text-[#040920]">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-sm text-[rgba(13,31,60,0.45)]"
                >
                  Nenhum evento encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[rgba(4,9,32,0.05)] transition-colors last:border-0 hover:bg-[rgba(13,31,60,0.015)]"
                >
                  <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-[rgba(13,31,60,0.55)]">
                    {dtf.format(row.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-[#040920]">
                    {row.actorName ?? <span style={{ color: textFaint }}>Sistema</span>}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[rgba(13,31,60,0.75)]">
                    {row.action}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: auditEntityBadgeColors[row.entityType]?.bg ?? '#eef1f6',
                          color: auditEntityBadgeColors[row.entityType]?.text ?? '#59677a',
                        }}
                      >
                        {entityTypeLabels[row.entityType] ?? row.entityType}
                      </span>
                      {row.entityId != null && (
                        <span className="text-[10px] text-[rgba(13,31,60,0.35)]">
                          #{row.entityId}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[rgba(13,31,60,0.45)]">
        <span>
          {rows.length === 0
            ? 'Nenhum evento.'
            : total != null
              ? `${rows.length} nesta página · ${total} evento${total !== 1 ? 's' : ''} no filtro`
              : `${rows.length} nesta página`}
        </span>
        <div className="flex gap-2">
          {keyset && (
            <a
              href={listUrl()}
              className={`flex h-8 items-center rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-xs text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
            >
              ← Início
            </a>
          )}
          {nextCursor && (
            <a
              href={listUrl({ cursor: nextCursor })}
              className={`flex h-8 items-center rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-xs text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
            >
              Próxima →
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
