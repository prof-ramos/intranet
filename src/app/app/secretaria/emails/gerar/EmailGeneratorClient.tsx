'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Mail, Clipboard, Sparkles, Loader2 } from 'lucide-react';
import { generateEmailAction } from './actions';
import { EMAIL_MODEL, getModelDisplayName } from '@/lib/ai/constants';
import {
  navy,
  primaryContainerHover,
  focusRingClass,
  cardBorder,
  cardShadow
} from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

type EmailType = 'newsletter' | 'convite' | 'comunicado' | 'aviso';

const PROMPT_MAX = 600;

const EMAIL_TYPES: { value: EmailType; icon: string; label: string }[] = [
  { value: 'newsletter', icon: '📰', label: 'Newsletter' },
  { value: 'convite',    icon: '📨', label: 'Convite'    },
  { value: 'comunicado', icon: '📣', label: 'Comunicado' },
  { value: 'aviso',      icon: '⚠️', label: 'Aviso'      },
];

export function EmailGeneratorClient() {
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [prompt, setPrompt]       = useState('');
  const [subject, setSubject]     = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [toast, setToast]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const iframeRef      = useRef<HTMLIFrameElement>(null);
  const toastTimerRef  = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

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
    if (!trimmed) { showToast('⚠️ Descreva o conteúdo do e-mail'); return; }

    setSubject('');
    setGeneratedHtml('');

    startTransition(async () => {
      const result = await generateEmailAction(emailType, trimmed);
      if (result.success) {
        setSubject(result.subject);
        setGeneratedHtml(result.html);
        showToast('✓ E-mail gerado com sucesso!');
      } else {
        showToast('❌ ' + result.error);
      }
    });
  };

  const copyHtml = async () => {
    if (!generatedHtml) return;
    try {
      await navigator.clipboard.writeText(generatedHtml);
      showToast('✓ HTML copiado para a área de transferência');
    } catch {
      showToast('❌ Erro ao copiar HTML');
    }
  };

  const copyForGmail = async () => {
    if (!generatedHtml) return;
    try {
      const item = new ClipboardItem({ 'text/html': new Blob([generatedHtml], { type: 'text/html' }) });
      await navigator.clipboard.write([item]);
      showToast('✓ E-mail copiado! Cole direto no Gmail (Ctrl+V)');
    } catch {
      await copyHtml();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const charCount = prompt.length;
  const charWarn  = charCount > PROMPT_MAX * 0.85;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── PAINEL ESQUERDO (Configurações) ── */}
      <aside className="flex w-full flex-shrink-0 flex-col gap-6 lg:w-[400px]">
        
        {/* Tipo de E-mail */}
        <section 
      className="rounded-[16px] bg-white p-5"
      style={{ border: cardBorder, boxShadow: cardShadow }}
    >
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Tipo de E-mail
      </h2>
          <div className="grid grid-cols-2 gap-3">
            {EMAIL_TYPES.map(({ value, icon, label }) => {
              const isActive = emailType === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${focusRingClass} ${
                    isActive
                      ? 'border-[#76AEEA] bg-[#f0f6fc] text-[#0d3260]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() => setEmailType(value)}
                  aria-pressed={isActive}
                >
                  <span aria-hidden="true" className="text-base">{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Descrição */}
        <section 
          className="rounded-[16px] bg-white p-5"
          style={{ border: cardBorder, boxShadow: cardShadow }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Descreva o E-mail
            </h2>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              <Sparkles className="h-3 w-3 text-[#76AEEA]" />
              {getModelDisplayName(EMAIL_MODEL)}
            </div>
          </div>
          
          <textarea
            className={`w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-[#76AEEA] focus:outline-none focus:ring-1 focus:ring-[#76AEEA] ${focusRingClass}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Convite para o Encontro Jurídico sobre registro sindical, dia 26 de maio às 15h pelo Google Meet. Conduzido pelo advogado Eder Machado Leite."
            aria-label="Descrição do e-mail"
            rows={6}
          />
          <div className="mt-2 flex items-center justify-end">
            <span 
              className={`text-xs font-medium ${charWarn ? 'text-amber-600' : 'text-slate-400'}`} 
              aria-live="polite"
            >
              {charCount}/{PROMPT_MAX}
            </span>
          </div>
        </section>

        {/* Gerar */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--primary-hover)] active:scale-[0.98] ${focusRingClass}`}
            style={{ 
              backgroundColor: navy, 
              '--primary-hover': primaryContainerHover 
            } as CSSProperties}
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            aria-busy={isPending}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Gerando e-mail...</span></>
            ) : (
              <><Sparkles className="h-4 w-4" aria-hidden="true" /><span>Gerar E-mail</span></>
            )}
          </button>
          <p className="text-center text-xs text-slate-500">
            Pressione <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-sans">Ctrl</kbd> + <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-sans">Enter</kbd> para gerar
          </p>
        </div>
      </aside>

      {/* ── PAINEL DIREITO (Pré-visualização) ── */}
      <section 
        className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-[16px] bg-white"
        style={{ border: cardBorder, boxShadow: cardShadow }}
        aria-label="Pré-visualização do e-mail"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 lg:px-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Pré-visualização
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
              onClick={copyHtml}
              disabled={!generatedHtml || isPending}
              title="Copiar código HTML"
            >
              <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copiar HTML</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0d3260] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
              onClick={copyForGmail}
              disabled={!generatedHtml || isPending}
              title="Copiar como HTML renderizado para colar no Gmail"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Copiar para Gmail</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto bg-slate-100/50 p-5 lg:p-8">
          <div className="mx-auto w-full max-w-[640px]">
            {isPending && (
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-slate-500" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-[#76AEEA]" aria-hidden="true" />
                <p className="text-sm font-medium">Gerando conteúdo com IA...</p>
              </div>
            )}

            {!isPending && !generatedHtml && (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm border border-slate-100">
                  ✉️
                </div>
                <h3 className="mb-2 font-serif text-xl font-medium text-slate-900">
                  Nenhum e-mail gerado
                </h3>
                <p className="mb-6 max-w-sm text-sm text-slate-500">
                  Preencha os campos ao lado e clique em <strong className="text-slate-700">Gerar E-mail</strong> para criar um novo modelo.
                </p>
                <ol className="flex flex-col gap-3 text-left text-sm text-slate-600" aria-label="Passos">
                  <li className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0369a1]" aria-hidden="true">1</span>
                    Escolha o tipo de e-mail
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0369a1]" aria-hidden="true">2</span>
                    Descreva o conteúdo em linguagem natural
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0369a1]" aria-hidden="true">3</span>
                    Gere o conteúdo final formatado
                  </li>
                </ol>
              </div>
            )}

            {!isPending && generatedHtml && (
              <div className="flex flex-col gap-4">
                {subject && (
                  <div className="flex flex-wrap items-baseline gap-3 rounded-[8px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#76AEEA]">
                      Assunto
                    </span>
                    <span className="text-sm font-medium text-slate-900">{subject}</span>
                  </div>
                )}
                <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
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

      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.startsWith('❌') 
              ? 'border border-red-200 bg-red-50 text-red-900' 
              : 'bg-slate-900 text-white'
          }`}
          role={toast.startsWith('❌') ? 'alert' : 'status'} 
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
