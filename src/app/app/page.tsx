// Drop-in replacement for: intranet/src/app/app/page.tsx
// Implements the chosen "Sala de Operações" dashboard direction.
//
// Reuses the existing Sidebar/Header chrome from src/app/app/layout.tsx —
// this file only owns the page body. All numbers below are placeholders;
// swap each `mock.*` source for a real Drizzle query.

import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { associates, activities } from '@/lib/db/schema';
import { eq, and, count, ne, sql } from 'drizzle-orm';
import {
  Plus, Calendar, Megaphone, Globe, ArrowRight,
  AlertTriangle, Clock, Mail,
} from 'lucide-react';
import Link from 'next/link';

// ───────────────────────────────────────────── tokens (mirror DESIGN.md)

const NAVY = '#040920';
const HAIR = 'rgba(4, 9, 32, 0.10)';

// ───────────────────────────────────────────── data

async function getStripe() {
  const [
    [{ ativos }],
    [{ analise }],
    [{ atividadesAbertas }],
    [{ atrasadas }],
  ] = await Promise.all([
    db.select({ ativos: count() }).from(associates).where(eq(associates.associationStatus, 'ativo')),
    db.select({ analise: count() }).from(associates).where(eq(associates.contributionStatus, 'pendente_migracao')),
    db.select({ atividadesAbertas: count() }).from(activities).where(ne(activities.status, 'concluido')),
    db.select({ atrasadas: count() }).from(activities).where(
      and(ne(activities.status, 'concluido'), sql`${activities.dueDate} < datetime('now')`),
    ),
  ]);

  return [
    { value: ativos.toLocaleString('pt-BR'), label: 'associados ativos' },
    { value: String(analise), label: 'em análise' },
    { value: String(atividadesAbertas), label: 'atividades em aberto' },
    { value: String(atrasadas), label: 'atrasadas', tone: 'neg' as const },
    { value: '94%', label: 'contribuições em dia', tone: 'pos' as const }, // TODO: query real
  ];
}

// Mock content for sections that depend on schema we don't fully cover yet.
const mockKanban = [
  {
    key: 'a_fazer', title: 'A fazer', count: 14, accent: '#94a3b8',
    cards: [
      { title: 'Publicar boletim — Maio/2026', tag: 'Comunicação', priority: 'normal', due: '20/05' },
      { title: 'Atualizar formulário de adesão', tag: 'Secretaria', priority: 'baixa' },
      { title: 'Revisar carta de boas-vindas', tag: 'Comunicação', priority: 'normal', due: '15/05' },
    ],
  },
  {
    key: 'andamento', title: 'Em andamento', count: 9, accent: '#76AEEA',
    cards: [
      { title: 'Validar 12 cadastros (lote SIAPE)', tag: 'Secretaria', priority: 'alta', due: '14/05', who: 'CF' },
      { title: 'Renovação Conselho Fiscal', tag: 'Diretoria', priority: 'urgente', due: '11/05', who: 'MA' },
      { title: 'Migração base de contribuições', tag: 'TI', priority: 'alta', due: '22/05', who: 'JR' },
    ],
  },
  {
    key: 'aguardando', title: 'Aguardando terceiros', count: 6, accent: '#e7c16b',
    cards: [
      { title: 'Resposta CGRH — pauta Maio', tag: 'Diretoria', priority: 'alta', due: '12/05', who: 'MA' },
      { title: 'Ofício — Embaixada em Tóquio', tag: 'Secretaria', priority: 'normal', who: 'CF' },
    ],
  },
  {
    key: 'concluido', title: 'Concluído', count: 23, accent: '#86efac',
    cards: [
      { title: 'Convocação Assembleia Ordinária', tag: 'Diretoria', priority: 'alta', done: '06/05', who: 'MA' },
      { title: 'Migração de associados (etapa 1)', tag: 'TI', priority: 'alta', done: '05/05', who: 'JR' },
    ],
  },
];

const mockAlerts = [
  { tone: 'neg', Icon: AlertTriangle, title: 'Renovação de mandato vence em 3 dias', body: 'Conselho Fiscal — publicar edital até 11/05.' },
  { tone: 'warn', Icon: Clock, title: '6 atividades atrasadas', body: 'Concentradas em Secretaria (4) e Comunicação (2).' },
  { tone: 'info', Icon: Mail, title: '12 e-mails de associados sem resposta', body: 'SLA interno: 48h — média de 36h esta semana.' },
];

const mockRegioes = [
  { label: 'Brasília · SERE', count: 312, pct: 100 },
  { label: 'América do Norte', count: 184, pct: 59 },
  { label: 'Europa', count: 221, pct: 71 },
  { label: 'América do Sul', count: 156, pct: 50 },
  { label: 'Ásia & Oceania', count: 98, pct: 31 },
  { label: 'África & Oriente Médio', count: 73, pct: 23 },
];

// ───────────────────────────────────────────── helpers

const prTone = (p?: string) =>
  p === 'urgente' ? '#b91c1c'
  : p === 'alta' ? '#a16207'
  : p === 'baixa' ? 'rgba(13,31,60,0.5)'
  : 'rgba(13,31,60,0.7)';

const alertTone = (t: string) => t === 'neg' ? '#b91c1c' : t === 'warn' ? '#a16207' : NAVY;

// ───────────────────────────────────────────── page

export default async function DashboardPage() {
  const user = await requireAuth();
  const stripe = await getStripe();

  return (
    <main className="px-8 py-8 lg:px-10">
      {/* Title row */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
            Sala de operações · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-none tracking-tight md:text-5xl">
            Painel da diretoria
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm h-10">
            <Calendar size={16} aria-hidden="true" /> Esta semana
          </button>
          <Link href="/app/atividades/nova" className="btn btn-primary btn-sm h-10">
            <Plus size={16} aria-hidden="true" /> Nova atividade
          </Link>
        </div>
      </div>

      {/* KPI stripe */}
      <section
        className="mb-7 flex overflow-hidden rounded-box bg-base-100"
        style={{ border: `1px solid ${HAIR}` }}
        aria-label="Indicadores"
      >
        {stripe.map((s, i) => (
          <div
            key={i}
            className="flex flex-1 items-baseline gap-3 px-5 py-4"
            style={{ borderLeft: i === 0 ? 'none' : `1px solid ${HAIR}` }}
          >
            <span
              className="font-serif text-3xl font-bold leading-none tracking-tight"
              style={{ color: s.tone === 'neg' ? '#b91c1c' : s.tone === 'pos' ? '#15803d' : undefined }}
            >
              {s.value}
            </span>
            <span className="text-xs lowercase text-base-content/65">{s.label}</span>
          </div>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Kanban */}
        <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold">Atividades em curso</h2>
            <Link href="/app/atividades" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Abrir kanban <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {mockKanban.map((c) => (
              <div key={c.key} className="rounded-2xl bg-base-200 p-3" style={{ minHeight: 380 }}>
                <div className="flex items-center justify-between px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: c.accent }} />
                    <p className="text-xs font-bold uppercase tracking-wider">{c.title}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-base-content/55">{c.count}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {c.cards.map((card, i) => (
                    <article
                      key={i}
                      className="rounded-xl bg-base-100 p-3"
                      style={{ border: `1px solid ${HAIR}`, boxShadow: '0 1px 0 rgba(4,9,32,0.04)' }}
                    >
                      <p className="text-sm font-semibold leading-snug">{card.title}</p>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-base-content/70"
                          style={{ background: 'var(--color-base-200)', border: `1px solid ${HAIR}` }}
                        >
                          {card.tag}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {'priority' in card && card.priority && (
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: prTone(card.priority) }}>
                              {card.priority}
                            </span>
                          )}
                          {'due' in card && card.due && (
                            <span className="text-[10px] text-base-content/55">· {card.due}</span>
                          )}
                          {'done' in card && card.done && (
                            <span className="text-[10px] font-semibold text-success">✓ {card.done}</span>
                          )}
                          {'who' in card && card.who && (
                            <span className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-content">
                              {card.who}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Avisos</h2>
            </div>
            <ul className="flex flex-col gap-3.5">
              {mockAlerts.map((a, i) => {
                const Icon = a.Icon;
                const isLast = i === mockAlerts.length - 1;
                return (
                  <li
                    key={i}
                    className="grid grid-cols-[24px_1fr] gap-3 pb-3.5"
                    style={{ borderBottom: isLast ? 'none' : `1px solid ${HAIR}` }}
                  >
                    <Icon size={20} aria-hidden="true" style={{ color: alertTone(a.tone), marginTop: 2 }} />
                    <div>
                      <p className="text-sm font-semibold leading-snug">{a.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-base-content/60">{a.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-box bg-base-100 p-5" style={{ border: `1px solid ${HAIR}` }}>
            <div className="mb-3 flex items-center gap-2">
              <Globe size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-bold">Associados por região</h2>
            </div>
            <ul className="flex flex-col gap-3">
              {mockRegioes.map((l, i) => (
                <li key={i}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <p className="text-sm font-medium">{l.label}</p>
                    <p className="font-serif text-sm font-bold">{l.count}</p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-base-200">
                    <div className="h-full bg-primary" style={{ width: `${l.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-base-content/55">
            Olá, {user.name.split(' ')[0]}. Logado como{' '}
            <span className="capitalize">{user.role}</span>.
          </p>
        </aside>
      </section>
    </main>
  );
}
