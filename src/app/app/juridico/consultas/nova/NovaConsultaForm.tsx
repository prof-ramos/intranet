'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { createConsultation } from '@/app/app/juridico/actions';

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
          className="btn btn-ghost btn-circle btn-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-base-content/55">
            Jurídico / Consultas
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Nova consulta</h1>
        </div>
      </div>

      <form action={handleSubmit} className="max-w-2xl">
        <div className="mb-5">
          <label htmlFor="title" className="label">
            <span className="label-text font-semibold">Título da consulta *</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Devolução de valores pagos pelo MRE"
            className="input input-bordered w-full"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="questionSummary" className="label">
            <span className="label-text font-semibold">Resumo da pergunta *</span>
          </label>
          <input
            id="questionSummary"
            name="questionSummary"
            type="text"
            required
            value={questionSummary}
            onChange={(e) => setQuestionSummary(e.target.value)}
            placeholder="Resumo em uma linha"
            className="input input-bordered w-full"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="questionFullText" className="label">
            <span className="label-text font-semibold">Descrição completa</span>
          </label>
          <textarea
            id="questionFullText"
            name="questionFullText"
            rows={5}
            value={questionFullText}
            onChange={(e) => setQuestionFullText(e.target.value)}
            placeholder="Texto completo da consulta do associado..."
            className="textarea textarea-bordered w-full"
          />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="associateId" className="label">
              <span className="label-text font-semibold">Associado</span>
            </label>
            <select
              id="associateId"
              name="associateId"
              value={associateId}
              onChange={(e) => setAssociateId(e.target.value)}
              className="select select-bordered w-full"
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
            <label htmlFor="slaDays" className="label">
              <span className="label-text font-semibold">Prazo de resposta (dias)</span>
            </label>
            <input
              id="slaDays"
              name="slaDays"
              type="number"
              min={1}
              max={90}
              value={slaDays}
              onChange={(e) => setSlaDays(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-5">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary min-h-11 px-4"
          >
            <Save size={16} aria-hidden="true" />
            {saving ? 'Salvando...' : 'Salvar consulta'}
          </button>
          <Link
            href="/app/juridico/consultas"
            className="btn btn-outline border-base-300 min-h-11 px-4"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
