import { requireRole } from '@/lib/auth/authorization';
import { parseAuditSearchParams } from '@/lib/audit/search-params';
import { db } from '@/lib/db';
import { auditLogs, type AuditLog } from '@/lib/db/schema/audit';
import { admins } from '@/lib/db/schema/admins';
import { desc, eq, and, gte, lt, ilike, count } from 'drizzle-orm';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import type { SQL } from 'drizzle-orm';
import { focusRingClass } from '@/lib/ui/tokens';

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

const entityTypeBadge: Record<string, string> = {
  associate: 'bg-blue-50 text-blue-700',
  admin: 'bg-purple-50 text-purple-700',
  activity: 'bg-amber-50 text-amber-700',
  assignment: 'bg-teal-50 text-teal-700',
  legal_consultation: 'bg-rose-50 text-rose-700',
  legal_process: 'bg-rose-50 text-rose-700',
  finance: 'bg-green-50 text-green-700',
  monthly_payment: 'bg-green-50 text-green-700',
  official_letter: 'bg-sky-50 text-sky-700',
  domain_event: 'bg-gray-50 text-gray-700',
  webhook_subscription: 'bg-indigo-50 text-indigo-700',
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipo?: string; q?: string; de?: string; ate?: string }>;
}) {
  await requireRole(['admin', 'diretoria']);

  const { page, entityType, q, de, ate } = parseAuditSearchParams(await searchParams);

  const filters: SQL[] = [];

  if (entityType && Object.prototype.hasOwnProperty.call(entityTypeLabels, entityType)) {
    filters.push(eq(auditLogs.entityType, entityType as AuditLog['entityType']));
  }
  if (q) {
    filters.push(ilike(auditLogs.action, `%${escapeLikePattern(q)}%`));
  }
  // BRT = UTC-3, fixed offset since Brazil eliminated DST in 2019.
  // new Date('YYYY-MM-DDT00:00:00-03:00') gives the correct São Paulo midnight in UTC.
  if (de) {
    const d = new Date(`${de}T00:00:00-03:00`);
    if (!isNaN(d.getTime())) filters.push(gte(auditLogs.createdAt, d));
  }
  if (ate) {
    const d = new Date(`${ate}T00:00:00-03:00`);
    if (!isNaN(d.getTime())) {
      // Exclusive upper bound: start of next day in BRT = +24h
      d.setUTCDate(d.getUTCDate() + 1);
      filters.push(lt(auditLogs.createdAt, d));
    }
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  // Count first so we can clamp page before fetching rows (avoids empty-table
  // with misleading footer when a manual URL supplies page > totalPages).
  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const effectivePage = total > 0 ? Math.min(page, totalPages) : 1;

  const rows = await db
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
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((effectivePage - 1) * PAGE_SIZE);

  const from = total === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(effectivePage * PAGE_SIZE, total);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (entityType) sp.set('tipo', entityType);
    if (q) sp.set('q', q);
    if (de) sp.set('de', de);
    if (ate) sp.set('ate', ate);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return `/app/config/auditoria${qs ? `?${qs}` : ''}`;
  }

  const hasFilters = q || entityType || de || ate;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
        Configurações · Auditoria
      </p>
      <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">Auditoria</h1>

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
                    {row.createdAt.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo',
                    })}
                  </td>
                  <td className="px-5 py-3 text-[#040920]">
                    {row.actorName ?? (
                      <span className="text-[rgba(13,31,60,0.35)] italic">Sistema</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-[rgba(13,31,60,0.75)]">
                    {row.action}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${entityTypeBadge[row.entityType] ?? 'bg-gray-50 text-gray-700'}`}
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
          {total === 0
            ? 'Nenhum evento.'
            : `${from}–${to} de ${total} evento${total !== 1 ? 's' : ''}`}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            {effectivePage > 1 && (
              <a
                href={pageUrl(effectivePage - 1)}
                className={`flex h-8 items-center rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-xs text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
              >
                ← Anterior
              </a>
            )}
            {effectivePage < totalPages && (
              <a
                href={pageUrl(effectivePage + 1)}
                className={`flex h-8 items-center rounded-[6px] border border-[rgba(4,9,32,0.12)] bg-white px-3 text-xs text-[rgba(13,31,60,0.65)] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
              >
                Próxima →
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
