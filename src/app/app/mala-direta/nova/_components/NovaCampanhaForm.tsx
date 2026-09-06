'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { createMailingCampaignAction, previewMailingAudienceAction } from '../../actions';
import { findUnknownTemplateVariables, MAILING_TEMPLATE_VARIABLES } from '@/lib/mailing/templates';
import { focusRingClass, hairline, textMuted } from '@/lib/ui/tokens';
import type { MailingPreviewResult } from '@/lib/mailing/service';

type Channel = 'email' | 'etiquetas';

interface Filters {
  associationStatus?: 'associado' | 'nao_associado';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  contributionStatus?: 'em_dia' | 'inadimplente';
  location?: 'brasil' | 'exterior';
  associationCategory?: string;
  assignment?: string;
}

const SELECT_CLASS = [
  'w-full rounded-[8px] border bg-white px-3 py-2 text-sm',
  focusRingClass,
].join(' ');

const DEFAULT_TEMPLATE = [
  'Prezado(a) {{nome}},',
  '',
  'Escreva aqui o corpo da mensagem.',
  '',
  'Atenciosamente,',
  'ASOF',
].join('\n');

export function NovaCampanhaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<Channel>('email');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [templateBody, setTemplateBody] = useState(DEFAULT_TEMPLATE);
  const [filters, setFilters] = useState<Filters>({ associationStatus: 'associado' });
  const [preview, setPreview] = useState<MailingPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await previewMailingAudienceAction({ channel, filters });
          if (!cancelled) setPreview(result);
        } catch {
          if (!cancelled) setPreview(null);
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [channel, filters]);

  const unknownVariables = findUnknownTemplateVariables(templateBody);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => {
      const next = { ...current };
      if (value === '') {
        delete next[key];
      } else {
        next[key] = value as never;
      }
      return next;
    });
  }

  function insertVariable(key: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? templateBody.length;
    const end = textarea.selectionEnd ?? templateBody.length;
    const variable = `{{${key}}}`;
    setTemplateBody(templateBody.slice(0, start) + variable + templateBody.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!preview || preview.count === 0) {
      setError('Nenhum destinatário corresponde aos filtros selecionados.');
      return;
    }
    if (preview.exceedsLimit) {
      setError('O público selecionado excede o limite de destinatários por campanha.');
      return;
    }
    if (unknownVariables.length > 0) {
      setError(`Variáveis desconhecidas no template: ${unknownVariables.join(', ')}.`);
      return;
    }
    startTransition(async () => {
      try {
        await createMailingCampaignAction({
          name,
          channel,
          subject: subject || undefined,
          templateBody,
          filters,
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Não foi possível criar a campanha.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold" style={{ color: textMuted }}>
          Canal
        </legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {(['email', 'etiquetas'] as const).map((option) => (
            <label
              key={option}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border bg-white px-4 py-2 text-sm font-medium"
              style={{ borderColor: channel === option ? '#0d3260' : hairline }}
            >
              <input
                type="radio"
                name="channel"
                value={option}
                checked={channel === option}
                onChange={() => setChannel(option)}
                className="accent-[#06284f]"
              />
              {option === 'email' ? 'E-mail em lote' : 'Etiquetas (impressão postal)'}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold" style={{ color: textMuted }}>
            Nome da campanha
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={3}
            maxLength={120}
            placeholder="Ex.: Convite assembleia geral 2026"
            className={SELECT_CLASS}
          />
        </label>

        {channel === 'email' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold" style={{ color: textMuted }}>
              Assunto do e-mail
            </span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={180}
              placeholder="Ex.: Assembleia geral — convite"
              className={SELECT_CLASS}
            />
          </label>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold" style={{ color: textMuted }}>
          Público-alvo
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Situação associativa
            </span>
            <select
              value={filters.associationStatus ?? ''}
              onChange={(event) => updateFilter('associationStatus', event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="associado">Associado</option>
              <option value="nao_associado">Não associado</option>
              <option value="">Todos</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Situação funcional
            </span>
            <select
              value={filters.functionalStatus ?? ''}
              onChange={(event) => updateFilter('functionalStatus', event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Todas</option>
              <option value="ativo">Ativo</option>
              <option value="aposentado">Aposentado</option>
              <option value="cedido">Cedido</option>
              <option value="em_licenca">Em licença</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Contribuição
            </span>
            <select
              value={filters.contributionStatus ?? ''}
              onChange={(event) => updateFilter('contributionStatus', event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Todas</option>
              <option value="em_dia">Em dia</option>
              <option value="inadimplente">Inadimplente</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Localização
            </span>
            <select
              value={filters.location ?? ''}
              onChange={(event) => updateFilter('location', event.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Todas</option>
              <option value="brasil">Brasil</option>
              <option value="exterior">Exterior</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Categoria
            </span>
            <input
              type="text"
              value={filters.associationCategory ?? ''}
              onChange={(event) => updateFilter('associationCategory', event.target.value)}
              placeholder="Ex.: efetivo"
              maxLength={120}
              className={SELECT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              Lotação
            </span>
            <input
              type="text"
              value={filters.assignment ?? ''}
              onChange={(event) => updateFilter('assignment', event.target.value)}
              placeholder="Ex.: SERE ou Paris"
              maxLength={120}
              className={SELECT_CLASS}
            />
          </label>
        </div>

        <div
          className="mt-4 rounded-[8px] border bg-slate-50 px-4 py-3 text-sm"
          style={{ borderColor: hairline }}
        >
          {isPending || !preview ? (
            <span className="inline-flex items-center gap-2 text-[#5b6b80]">
              <Loader2 size={16} className="animate-spin" />
              Calculando público…
            </span>
          ) : (
            <>
              <span className="font-semibold text-[#06284f]">{preview.count}</span>
              <span style={{ color: textMuted }}>
                {' '}
                destinatário{preview.count === 1 ? '' : 's'}
                {channel === 'email' ? ' com e-mail cadastrado' : ' com endereço postal'}
              </span>
              {preview.exceedsLimit && (
                <span className="ml-2 font-semibold text-red-700">
                  — excede o limite por campanha
                </span>
              )}
              {preview.sample.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs" style={{ color: textMuted }}>
                  {preview.sample.map((member) => (
                    <li key={member.associateId}>{member.name}</li>
                  ))}
                  {preview.count > preview.sample.length && (
                    <li>… e mais {preview.count - preview.sample.length}</li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold" style={{ color: textMuted }}>
          Template
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MAILING_TEMPLATE_VARIABLES.map((variable) => (
            <button
              key={variable.key}
              type="button"
              onClick={() => insertVariable(variable.key)}
              title={variable.label}
              className="rounded-full border bg-white px-3 py-1 text-xs font-medium transition-colors hover:border-[#0d3260] hover:text-[#06284f]"
              style={{ borderColor: hairline, color: textMuted }}
            >
              {'{{' + variable.key + '}}'}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={templateBody}
          onChange={(event) => setTemplateBody(event.target.value)}
          required
          rows={10}
          maxLength={20_000}
          className={[
            'mt-3 w-full rounded-[8px] border bg-white px-3 py-2 font-mono text-sm leading-relaxed',
            focusRingClass,
          ].join(' ')}
        />
        {unknownVariables.length > 0 && (
          <p className="mt-2 text-sm text-red-700">
            Variáveis desconhecidas: {unknownVariables.map((item) => `{{${item}}}`).join(', ')}
          </p>
        )}
        {channel === 'email' && (
          <p className="mt-2 text-xs text-[#5b6b80]">
            O corpo é convertido para HTML e texto puro no envio. Pular linha em branco separa
            parágrafos.
          </p>
        )}
      </fieldset>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#040920] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d3260] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {channel === 'email' ? 'Criar campanha de e-mail' : 'Criar folha de etiquetas'}
        </button>
      </div>
    </form>
  );
}
