'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Mail, Clipboard, Sparkles, Loader2 } from 'lucide-react';
import { generateEmailAction } from './actions';

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
    <div className="email-generator-container">
      <header>
        <div>
          <div className="header-logo">AS<span>◎</span>F</div>
          <div className="header-sub">Gerador de E-mails Institucionais</div>
        </div>
        <div className="header-badge">✦ Gemini 2.0 Flash</div>
      </header>

      <main>
        {/* ── PAINEL ESQUERDO ── */}
        <aside className="panel-left">
          <div className="panel-section">
            <div className="panel-label">Tipo de E-mail</div>
            <div className="type-grid">
              {EMAIL_TYPES.map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`type-btn${emailType === value ? ' active' : ''}`}
                  onClick={() => setEmailType(value)}
                  aria-pressed={emailType === value}
                >
                  <span className="type-icon" aria-hidden="true">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-label">Descreva o E-mail</div>
            <textarea
              className="prompt-area"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Convite para o Encontro Jurídico sobre registro sindical, dia 26 de maio às 15h pelo Google Meet. Conduzido pelo advogado Eder Machado Leite."
              aria-label="Descrição do e-mail"
            />
            <div className="prompt-footer">
              <span className={`char-count${charWarn ? ' warn' : ''}`} aria-live="polite">
                {charCount}/{PROMPT_MAX}
              </span>
            </div>
          </div>

          <div className="btn-generate-wrap">
            <button
              type="button"
              className="btn-generate"
              onClick={handleGenerate}
              disabled={isPending || !prompt.trim()}
              aria-busy={isPending}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Gerando...</span></>
              ) : (
                <><Sparkles className="h-4 w-4" aria-hidden="true" /><span>Gerar E-mail</span></>
              )}
            </button>
            <p className="shortcut-hint">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para gerar
            </p>
          </div>
        </aside>

        {/* ── PAINEL DIREITO ── */}
        <section className="panel-right" aria-label="Pré-visualização do e-mail">
          <div className="preview-toolbar">
            <span className="preview-title">Pré-visualização</span>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn-action"
                onClick={copyHtml}
                disabled={!generatedHtml || isPending}
                title="Copiar código HTML"
              >
                <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar HTML</span>
              </button>
              <button
                type="button"
                className="btn-action primary"
                onClick={copyForGmail}
                disabled={!generatedHtml || isPending}
                title="Copiar como HTML renderizado para colar no Gmail"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar para Gmail</span>
              </button>
            </div>
          </div>

          <div className="preview-frame">
            <div className="preview-inner">
              {isPending && (
                <div className="loading-state" role="status" aria-live="polite">
                  <div className="spinner" aria-hidden="true" />
                  <p className="loading-text">Gerando e-mail com Gemini…</p>
                </div>
              )}

              {!isPending && !generatedHtml && (
                <div className="empty-state">
                  <div className="empty-icon" aria-hidden="true">✉️</div>
                  <div className="empty-title">Nenhum e-mail gerado</div>
                  <p className="empty-desc">Preencha o formulário ao lado e clique em <strong style={{ color: 'var(--gold)' }}>Gerar E-mail</strong>.</p>
                  <ol className="empty-steps" aria-label="Passos">
                    <li><span className="empty-step-num" aria-hidden="true">1</span>Escolha o tipo de e-mail</li>
                    <li><span className="empty-step-num" aria-hidden="true">2</span>Descreva o conteúdo em linguagem natural</li>
                    <li><span className="empty-step-num" aria-hidden="true">3</span>Clique em Gerar ou pressione <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>Ctrl+Enter</kbd></li>
                  </ol>
                </div>
              )}

              {!isPending && generatedHtml && (
                <>
                  {subject && (
                    <div className="subject-bar">
                      <span className="subject-label">Assunto</span>
                      <span>{subject}</span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    srcDoc={generatedHtml}
                    title="Pré-visualização do e-mail gerado"
                    sandbox="allow-same-origin"
                    className="w-full rounded-md border-0 bg-white"
                    style={{ minHeight: '600px' }}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {toast && (
        <div className="email-generator-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
