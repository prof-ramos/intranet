'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, Clipboard, Sparkles, Loader2 } from 'lucide-react';

const DESIGN_SYSTEM = `
Você é um especialista em e-mail marketing institucional da ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro).

DESIGN SYSTEM ASOF:
- Fundo principal: #0f2044 (azul marinho)
- Fundo secundário: #0a1828
- Cor de destaque: #c9a84c (dourado)
- Texto principal: #ffffff
- Texto secundário: #d0dce8
- Texto sutil: #a8c0d6
- Borda: #c9a84c
- Fonte: Georgia, serif (títulos) | Arial, sans-serif (corpo)
- Logo: <img src="https://asof.org.br/img/asof-dark.svg" alt="ASOF" width="160" style="display:block;border:0;max-width:160px;"/>

REGRAS OBRIGATÓRIAS DE E-MAIL HTML:
- Use APENAS tabelas para layout (table, tr, td) — NUNCA div para estrutura
- Todos os estilos INLINE — NUNCA CSS externo ou <style>
- Largura máxima do container: 600px
- Sempre inclua o logo ASOF no cabeçalho
- Sempre inclua rodapé com link de descadastro
- O e-mail deve ser compatível com Gmail, Outlook e Apple Mail
- Linha separadora: border-top:1px solid #c9a84c

RETORNE APENAS:
1. Uma linha com o assunto: ASSUNTO: [assunto aqui]
2. O HTML completo do e-mail (começando com <!DOCTYPE html>)

NÃO inclua explicações, markdown, ou qualquer outro texto além disso.
`;

type EmailType = 'newsletter' | 'convite' | 'comunicado' | 'aviso';

export function EmailGeneratorClient() {
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

  // Ajusta a altura do iframe dinamicamente conforme o conteúdo renderizado
  const adjustIframeHeight = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
      iframe.style.height = '600px'; // Altura mínima padrão
      const scrollHeight = iframe.contentDocument.body.scrollHeight;
      iframe.style.height = `${Math.max(scrollHeight + 40, 600)}px`;
    }
  };

  useEffect(() => {
    if (generatedHtml && iframeRef.current) {
      // Pequeno timeout para garantir que o srcDoc foi renderizado pelo navegador
      const timer = setTimeout(adjustIframeHeight, 200);
      return () => clearTimeout(timer);
    }
  }, [generatedHtml]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedPrompt) {
      showToast('⚠️ Descreva o conteúdo do e-mail');
      return;
    }
    if (!trimmedApiKey) {
      showToast('⚠️ Insira sua chave da API Gemini');
      return;
    }

    setLoading(true);
    setSubject('');
    setGeneratedHtml('');

    const userPrompt = `Tipo de e-mail: ${emailType.toUpperCase()}

Conteúdo solicitado pelo usuário:
${trimmedPrompt}

Gere um e-mail HTML completo no design system da ASOF para este tipo de comunicação.`;

    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': trimmedApiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: DESIGN_SYSTEM }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Erro na API Gemini');
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extrair assunto
      const subjectMatch = raw.match(/ASSUNTO:\s*(.+)/i);
      const extractedSubject = subjectMatch ? subjectMatch[1].trim() : '';

      // Extrair HTML
      let html = raw.replace(/ASSUNTO:\s*.+\n?/i, '').trim();
      html = html
        .replace(/^```html\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();

      if (!html.toLowerCase().includes('<html')) {
        // Fallback básico caso o modelo não retorne HTML válido
        throw new Error('O modelo não retornou um documento HTML válido. Tente novamente.');
      }

      setSubject(extractedSubject);
      setGeneratedHtml(html);
      showToast('✓ E-mail gerado com sucesso!');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao gerar e-mail';
      showToast('❌ ' + errorMessage);
    } finally {
      setLoading(false);
    }
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
      // Fallback para cópia em texto do HTML caso ClipboardItem falhe
      await copyHtml();
      showToast('✓ HTML copiado (ClipboardItem indisponível)');
    }
  };

  // Atalho Ctrl+Enter para gerar
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

          {/* API Key */}
          <div className="panel-section">
            <div className="panel-label">Chave da API Gemini</div>
            <input
              type="password"
              className="api-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              autoComplete="off"
            />
            <p className="api-hint">
              Sua chave não é armazenada — ela é usada apenas para as requisições nesta sessão.
            </p>
          </div>

          {/* Botão de Geração */}
          <button
            type="button"
            className="btn-generate"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
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
                disabled={!generatedHtml || loading}
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Copiar HTML</span>
              </button>
              <button
                type="button"
                className="btn-action primary"
                onClick={copyForGmail}
                disabled={!generatedHtml || loading}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Copiar para Gmail</span>
              </button>
            </div>
          </div>

          <div className="preview-frame">
            <div className="preview-inner">
              {loading && (
                <div className="loading-state">
                  <div className="spinner" />
                  <p className="loading-text">Gerando e-mail com Gemini...</p>
                </div>
              )}

              {!loading && !generatedHtml && (
                <div className="empty-state">
                  <div className="empty-icon">✉️</div>
                  <div className="empty-title">Nenhum e-mail gerado ainda</div>
                  <p className="empty-desc">
                    Preencha o formulário ao lado e clique em &quot;Gerar E-mail&quot; para criar
                    uma comunicação institucional no padrão ASOF.
                  </p>
                </div>
              )}

              {!loading && generatedHtml && (
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
