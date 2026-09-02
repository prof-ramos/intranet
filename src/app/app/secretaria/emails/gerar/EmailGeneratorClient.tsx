'use client';

import { useState, useRef, useEffect, useTransition, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Clipboard,
  Loader2,
  Mail,
  Megaphone,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { generateEmailAction } from './actions';
import { EMAIL_MODEL, getModelDisplayName } from '@/lib/ai/constants';
import {
  alertDangerBg,
  alertDangerBorder,
  alertDangerText,
  buttonOutlineBorder,
  focusRingClass,
  hairline,
  linkText,
  navy,
  primaryContainerHover,
  skyBlue,
  surfaceMuted,
  textFaint,
  textMuted,
  textPrimary,
  textStrong,
  warningText,
} from '@/lib/ui/tokens';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

type EmailType = 'newsletter' | 'convite' | 'comunicado' | 'aviso';

const PROMPT_MAX = 600;

const EMAIL_TYPES: { value: EmailType; icon: LucideIcon; label: string }[] = [
  { value: 'newsletter', icon: Newspaper, label: 'Newsletter' },
  { value: 'convite', icon: Mail, label: 'Convite' },
  { value: 'comunicado', icon: Megaphone, label: 'Comunicado' },
  { value: 'aviso', icon: AlertTriangle, label: 'Aviso' },
];

type ToastState = { variant: 'success' | 'error'; message: string } | null;

export function EmailGeneratorClient() {
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (variant: 'success' | 'error', message: string) => {
    setToast({ variant, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!generatedHtml || !iframeRef.current) return;
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument?.body) {
        iframe.style.height = '600px';
        const h = iframe.contentDocument.body.scrollHeight;
        iframe.style.height = `${Math.max(h + 40, 600)}px`;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [generatedHtml]);

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      showToast('error', 'Descreva o conteúdo do e-mail.');
      return;
    }

    setSubject('');
    setGeneratedHtml('');

    startTransition(async () => {
      const result = await generateEmailAction(emailType, trimmed);
      if (result.success) {
        setSubject(result.subject);
        setGeneratedHtml(result.html);
        showToast('success', 'E-mail gerado com sucesso.');
      } else {
        showToast('error', result.error);
      }
    });
  };

  const copyHtml = async () => {
    if (!generatedHtml) return;
    try {
      await navigator.clipboard.writeText(generatedHtml);
      showToast('success', 'HTML copiado para a área de transferência.');
    } catch {
      showToast('error', 'Erro ao copiar HTML.');
    }
  };

  const copyForGmail = async () => {
    if (!generatedHtml) return;
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([generatedHtml], { type: 'text/html' }),
      });
      await navigator.clipboard.write([item]);
      showToast('success', 'E-mail copiado. Cole direto no Gmail (Ctrl+V).');
    } catch {
      await copyHtml();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const charCount = prompt.length;
  const charWarn = charCount > PROMPT_MAX * 0.85;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[400px]">
        <section className="rounded-[16px] border bg-white p-5" style={{ borderColor: hairline }}>
          <h2
            className="mb-4 text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{ color: textMuted }}
          >
            Tipo de e-mail
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {EMAIL_TYPES.map(({ value, icon: Icon, label }) => {
              const isActive = emailType === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${focusRingClass}`}
                  style={{
                    borderColor: isActive ? skyBlue : buttonOutlineBorder,
                    backgroundColor: isActive ? '#f0f6fc' : '#ffffff',
                    color: isActive ? linkText : textMuted,
                  }}
                  onClick={() => setEmailType(value)}
                  aria-pressed={isActive}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[16px] border bg-white p-5" style={{ borderColor: hairline }}>
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-[11px] font-bold tracking-[0.18em] uppercase"
              style={{ color: textMuted }}
            >
              Descreva o e-mail
            </h2>
            <div
              className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ borderColor: hairline, backgroundColor: surfaceMuted, color: textMuted }}
            >
              <Sparkles className="h-3 w-3" style={{ color: skyBlue }} aria-hidden="true" />
              {getModelDisplayName(EMAIL_MODEL)}
            </div>
          </div>

          <textarea
            className={`w-full resize-y rounded-[8px] border bg-white px-4 py-3 text-sm transition-colors duration-150 ${focusRingClass}`}
            style={{ borderColor: hairline, color: textStrong }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Convite para o Encontro Jurídico sobre registro sindical, dia 26 de maio às 15h pelo Google Meet."
            aria-label="Descrição do e-mail"
            rows={6}
          />
          <div className="mt-2 flex items-center justify-end">
            <span
              className="text-xs font-medium"
              style={{ color: charWarn ? warningText : textFaint }}
              aria-live="polite"
            >
              {charCount}/{PROMPT_MAX}
            </span>
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.98] ${focusRingClass}`}
            style={
              { backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties
            }
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Gerando e-mail...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Gerar e-mail</span>
              </>
            )}
          </button>
          <p className="text-center text-xs" style={{ color: textMuted }}>
            Pressione{' '}
            <kbd
              className="rounded border px-1.5 py-0.5 font-sans text-[10px]"
              style={{ borderColor: hairline, backgroundColor: surfaceMuted }}
            >
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd
              className="rounded border px-1.5 py-0.5 font-sans text-[10px]"
              style={{ borderColor: hairline, backgroundColor: surfaceMuted }}
            >
              Enter
            </kbd>{' '}
            para gerar
          </p>
        </div>
      </aside>

      <section
        className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-[16px] border bg-white"
        style={{ borderColor: hairline }}
        aria-label="Pré-visualização do e-mail"
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3 lg:px-6"
          style={{ borderColor: hairline, backgroundColor: surfaceMuted }}
        >
          <h2
            className="text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{ color: textMuted }}
          >
            Pré-visualização
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-[8px] border bg-white px-3 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-[rgba(4,9,32,0.04)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
              style={{ borderColor: buttonOutlineBorder, color: textMuted }}
              onClick={copyHtml}
              disabled={!generatedHtml || isPending}
              title="Copiar código HTML"
            >
              <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copiar HTML</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-[8px] border bg-white px-3 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-[rgba(4,9,32,0.04)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
              style={{ borderColor: buttonOutlineBorder, color: linkText }}
              onClick={copyForGmail}
              disabled={!generatedHtml || isPending}
              title="Copiar como HTML renderizado para colar no Gmail"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copiar para Gmail</span>
            </button>
          </div>
        </div>

        <div
          className="flex flex-1 flex-col overflow-y-auto p-5 lg:p-8"
          style={{ backgroundColor: surfaceMuted }}
        >
          <div className="mx-auto w-full max-w-[640px]">
            {isPending && (
              <div
                className="flex min-h-[400px] flex-col items-center justify-center gap-4"
                style={{ color: textMuted }}
                role="status"
                aria-live="polite"
              >
                <Loader2
                  className="h-8 w-8 animate-spin"
                  style={{ color: skyBlue }}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">Gerando conteúdo com IA...</p>
              </div>
            )}

            {!isPending && !generatedHtml && (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border bg-white"
                  style={{ borderColor: hairline, color: linkText }}
                >
                  <Mail size={28} aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-serif text-xl font-medium" style={{ color: textPrimary }}>
                  Nenhum e-mail gerado
                </h3>
                <p className="mb-6 max-w-sm text-sm" style={{ color: textMuted }}>
                  Preencha os campos ao lado e clique em{' '}
                  <strong style={{ color: textStrong }}>Gerar e-mail</strong> para criar um novo
                  modelo.
                </p>
                <ol
                  className="flex flex-col gap-3 text-left text-sm"
                  style={{ color: textMuted }}
                  aria-label="Passos"
                >
                  {[
                    'Escolha o tipo de e-mail',
                    'Descreva o conteúdo em linguagem natural',
                    'Gere o conteúdo final formatado',
                  ].map((step, index) => (
                    <li key={step} className="flex items-center gap-3">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: '#e0f2fe', color: linkText }}
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!isPending && generatedHtml && (
              <div className="flex flex-col gap-4">
                {subject ? (
                  <div
                    className="flex flex-wrap items-baseline gap-3 rounded-[8px] border bg-white px-4 py-3"
                    style={{ borderColor: hairline }}
                  >
                    <span
                      className="text-xs font-bold tracking-wider uppercase"
                      style={{ color: skyBlue }}
                    >
                      Assunto
                    </span>
                    <span className="text-sm font-medium" style={{ color: textPrimary }}>
                      {subject}
                    </span>
                  </div>
                ) : null}
                <div
                  className="overflow-hidden rounded-[8px] border bg-white"
                  style={{ borderColor: hairline }}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={generatedHtml}
                    title="Pré-visualização do e-mail gerado"
                    sandbox=""
                    className="w-full bg-white"
                    style={{ minHeight: '600px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {toast ? (
        <div
          className="fixed right-6 bottom-6 z-50 max-w-sm rounded-[8px] border px-4 py-3 text-sm font-medium"
          style={
            toast.variant === 'error'
              ? {
                  borderColor: alertDangerBorder,
                  backgroundColor: alertDangerBg,
                  color: alertDangerText,
                }
              : {
                  borderColor: hairline,
                  backgroundColor: navy,
                  color: '#ffffff',
                }
          }
          role={toast.variant === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
