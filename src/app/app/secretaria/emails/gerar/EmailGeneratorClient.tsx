'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Mail, Clipboard, Sparkles, Loader2 } from 'lucide-react';
import { generateEmailAction } from './actions';

type EmailType = 'newsletter' | 'convite' | 'comunicado' | 'aviso';

export function EmailGeneratorClient() {
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const adjustIframeHeight = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
      iframe.style.height = '600px';
      const scrollHeight = iframe.contentDocument.body.scrollHeight;
      iframe.style.height = `${Math.max(scrollHeight + 40, 600)}px`;
    }
  };

  useEffect(() => {
    if (generatedHtml && iframeRef.current) {
      const timer = setTimeout(adjustIframeHeight, 200);
      return () => clearTimeout(timer);
    }
  }, [generatedHtml]);

  const handleGenerate = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      showToast('⚠️ Descreva o conteúdo do e-mail');
      return;
    }

    setSubject('');
    setGeneratedHtml('');

    startTransition(async () => {
      const result = await generateEmailAction(emailType, trimmedPrompt);
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
      const blob = new Blob([generatedHtml], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([item]);
      showToast('✓ E-mail copiado! Cole direto no Gmail (Ctrl+V)');
    } catch {
      await copyHtml();
      showToast('✓ HTML copiado (ClipboardItem indisponível)');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="email-generator-container">
      <header>
        <div>
          <div className="header-logo">
            AS<span>◎</span>F
          </div>
          <div className="header-sub">Gerador de E-mails Institucionais</div>
        </div>
        <div className="header-badge">✦ Powered by Gemini 2.0</div>
      </header>

      <main>
        {/* PAINEL ESQUERDO: CONTROLES */}
        <aside className="panel-left">
          {/* Tipo de E-mail */}
          <div className="panel-section">
            <div className="panel-label">Tipo de E-mail</div>
            <div className="type-grid">
              <button
                type="button"
                className={`type-btn ${emailType === 'newsletter' ? 'active' : ''}`}
                onClick={() => setEmailType('newsletter')}
              >
                <span className="type-icon">📰</span> Newsletter
              </button>
              <button
                type="button"
                className={`type-btn ${emailType === 'convite' ? 'active' : ''}`}
                onClick={() => setEmailType('convite')}
              >
                <span className="type-icon">📨</span> Convite
              </button>
              <button
                type="button"
                className={`type-btn ${emailType === 'comunicado' ? 'active' : ''}`}
                onClick={() => setEmailType('comunicado')}
              >
                <span className="type-icon">📣</span> Comunicado
              </button>
              <button
                type="button"
                className={`type-btn ${emailType === 'aviso' ? 'active' : ''}`}
                onClick={() => setEmailType('aviso')}
              >
                <span className="type-icon">⚠️</span> Aviso
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div className="panel-section">
            <div className="panel-label">Descreva o E-mail</div>
            <textarea
              className="prompt-area"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Convite para o Encontro Jurídico sobre registro sindical, dia 26 de maio às 15h pelo Google Meet. Conduzido pelo advogado Eder Machado Leite. Link: https://meet.google.com/pzi-czot-brk"
            />
          </div>

          {/* Botão de Geração */}
          <button
            type="button"
            className="btn-generate"
            onClick={handleGenerate}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Gerar E-mail</span>
              </>
            )}
          </button>
        </aside>

        {/* PAINEL DIREITO: PREVIEW */}
        <section className="panel-right">
          <div className="preview-toolbar">
            <span className="preview-title">Pré-visualização</span>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn-action"
                onClick={copyHtml}
                disabled={!generatedHtml || isPending}
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Copiar HTML</span>
              </button>
              <button
                type="button"
                className="btn-action primary"
                onClick={copyForGmail}
                disabled={!generatedHtml || isPending}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Copiar para Gmail</span>
              </button>
            </div>
          </div>

          <div className="preview-frame">
            <div className="preview-inner">
              {isPending && (
                <div className="loading-state">
                  <div className="spinner" />
                  <p className="loading-text">Gerando e-mail com Gemini...</p>
                </div>
              )}

              {!isPending && !generatedHtml && (
                <div className="empty-state">
                  <div className="empty-icon">✉️</div>
                  <div className="empty-title">Nenhum e-mail gerado ainda</div>
                  <p className="empty-desc">
                    Preencha o formulário ao lado e clique em &quot;Gerar E-mail&quot; para criar
                    uma comunicação institucional no padrão ASOF.
                  </p>
                </div>
              )}

              {!isPending && generatedHtml && (
                <>
                  {subject && (
                    <div className="subject-bar">
                      <div className="subject-label">Assunto sugerido</div>
                      <div className="font-semibold">{subject}</div>
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

      {/* Toast Notification */}
      {toast && <div className="email-generator-toast">{toast}</div>}
    </div>
  );
}
