'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { createConsultation } from '@/app/app/juridico/actions';
import { focusRingClass } from '@/lib/ui/tokens';

interface Props {
  associates: { id: number; name: string }[];
}

export function NovaConsultaForm({ associates }: Props) {
  const [title, setTitle] = useState('');
  const [questionSummary, setQuestionSummary] = useState('');
  const [questionFullText, setQuestionFullText] = useState('');
  const [associateId, setAssociateId] = useState('');
  const [slaDays, setSlaDays] = useState('7');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    setSaving(true);
    try {
      await createConsultation(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/app/juridico/consultas"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
            Jurídico / Consultas
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Nova consulta</h1>
        </div>
      </div>

      <form action={handleSubmit} className="max-w-2xl">
        <div className="mb-5">
          <label htmlFor="title" className="mb-1 block text-sm font-semibold text-[#0d1f3c]">
            Título da consulta *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Devolução de valores pagos pelo MRE"
            className={`h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="questionSummary"
            className="mb-1 block text-sm font-semibold text-[#0d1f3c]"
          >
            Resumo da pergunta *
          </label>
          <input
            id="questionSummary"
            name="questionSummary"
            type="text"
            required
            value={questionSummary}
            onChange={(e) => setQuestionSummary(e.target.value)}
            placeholder="Resumo em uma linha"
            className={`h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="questionFullText"
            className="mb-1 block text-sm font-semibold text-[#0d1f3c]"
          >
            Descrição completa
          </label>
          <textarea
            id="questionFullText"
            name="questionFullText"
            rows={5}
            value={questionFullText}
            onChange={(e) => setQuestionFullText(e.target.value)}
            placeholder="Texto completo da consulta do associado..."
            className={`w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
          />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="associateId"
              className="mb-1 block text-sm font-semibold text-[#0d1f3c]"
            >
              Associado
            </label>
            <select
              id="associateId"
              name="associateId"
              value={associateId}
              onChange={(e) => setAssociateId(e.target.value)}
              className={`h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] ${focusRingClass}`}
            >
              <option value="">Selecione...</option>
              {associates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="slaDays" className="mb-1 block text-sm font-semibold text-[#0d1f3c]">
              Prazo de resposta (dias)
            </label>
            <input
              id="slaDays"
              name="slaDays"
              type="number"
              min={1}
              max={90}
              value={slaDays}
              onChange={(e) => setSlaDays(e.target.value)}
              className={`h-10 w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0d1f3c] placeholder:text-[rgba(13,31,60,0.40)] ${focusRingClass}`}
            />
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-[10px] bg-[#fee2e2] px-4 py-3 text-[#b91c1c]">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white hover:bg-[#0d3260] disabled:opacity-60 ${focusRingClass}`}
          >
            <Save size={16} aria-hidden="true" />
            {saving ? 'Salvando...' : 'Salvar consulta'}
          </button>
          <Link
            href="/app/juridico/consultas"
            className={`inline-flex h-10 items-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
