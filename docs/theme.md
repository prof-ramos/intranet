@plugin "daisyui/theme" {
name: "ASOF";
default: false;
prefersdark: false;
color-scheme: "dark";
--color-base-100: oklch(14.076% 0.004 285.822);
--color-base-200: oklch(20.219% 0.004 308.229);
--color-base-300: oklch(23.219% 0.004 308.229);
--color-base-content: oklch(75.687% 0.123 76.89);
--color-primary: #040920;
--color-primary-content: #ffffff;
--color-secondary: oklch(27.581% 0.064 261.069);
--color-secondary-content: oklch(85.516% 0.012 261.069);
--color-accent: oklch(36.674% 0.051 338.825);
--color-accent-content: oklch(87.334% 0.01 338.825);
--color-neutral: #e7edf4;
--color-neutral-content: #040920;
--color-info: oklch(79.061% 0.121 237.133);
--color-info-content: oklch(15.812% 0.024 237.133);
--color-success: oklch(78.119% 0.192 132.154);
--color-success-content: oklch(15.623% 0.038 132.154);
--color-warning: oklch(86.127% 0.136 102.891);
--color-warning-content: oklch(17.225% 0.027 102.891);
--color-error: oklch(71.753% 0.176 22.568);
--color-error-content: oklch(14.35% 0.035 22.568);
--radius-selector: 1rem;
--radius-field: 0.5rem;
--radius-box: 1rem;
--size-selector: 0.25rem;
--size-field: 0.25rem;
--border: 1px;
--depth: 1;
--noise: 0;
}

> Tema aplicado no app em `src/app/globals.css` via Tailwind CSS 4 e DaisyUI 5.

# Diretrizes para redes sociais e e-mail

- Identidade e tom
  - Tom: institucional, claro, direto; evitar jargões; voz ativa.
  - Títulos/headers: `Playfair Display`; corpo e botões: `Inter`.
  - Hierarquia: título serif (600/700), subtítulo sans (500), corpo sans (400).
- Cores e fundos
  - Fundos preferenciais: `#040920` (primary) ou `#e7edf4` (neutral) para contraste com texto; `accent` em bordas/CTA.
  - Gradiente permitido: `from-primary-dark to-accent` para capas e banners.
  - Fotos: aplicar overlay `primary/70` ou `primary/80` para legibilidade de texto.
- Logos e segurança de marca
  - Avatares: logo em branco sobre fundo `primary` ou logo `primary` sobre fundo claro; margem interna 10–15%.
  - Não distorcer, não usar sombras pesadas; manter cantos `rounded-sm`.
- Formatos e dimensões (exportar em 2x quando possível)
  - Instagram feed: 1080x1080 (quadrado) ou 1080x1350 (retrato); stories: 1080x1920 com área segura (160px topo/rodapé, 120px laterais).
  - Twitter/X: post 1600x900; header 1500x500 (conteúdo seguro 1120x360).
  - LinkedIn: post 1200x1200; capa página 1128x191; capa perfil 1584x396.
  - E-mail banners: largura 600–640px; manter textos-chave em HTML (não embedar tudo na imagem).
- Tipografia e textos em arte
  - Tamanho mínimo: corpo 32px em peças mobile; títulos ≥44px; contraste mínimo AA.
  - Uppercase apenas para selos/datas; evitar blocos longos em caps.
  - Tracking aberto em selos/CTA (`tracking-[0.2em]` ou `tracking-widest`).
- CTAs e botões visuais
  - Botões: `primary` ou `accent` com texto branco/primary; altura visual ~50px; `rounded-sm`; sombra leve ou stroke fino.
  - CTA textual: verbo no infinitivo (“Acesse”, “Leia”, “Inscreva-se”); link clicável em e-mail/post.
- Imagens e ícones
  - Imagens institucionais (Itamaraty/consular); se conflitar com paleta, aplicar `grayscale` 20–30% e overlay.
  - Ícones `lucide` 24–32px; cor `accent` ou branco em fundos escuros.
- Acessibilidade e legibilidade
  - Alt text/legendas sempre que possível; contraste ≥4.5:1.
  - Respeitar áreas de corte/previews (headers e thumbs); manter conteúdo crítico na área segura.
- Hashtags e rodapé
  - 2–5 hashtags relevantes; evitar lista longa.
  - Assinatura curta para anúncios: “ASOF — Oficiais de Chancelaria”.
- E-mail (HTML)
  - Largura 600–640px; fundo `neutral` ou branco; títulos serif, corpo sans; line-height 1.5.
  - Botões: `bg-primary text-white`, padding 16–20px, altura mínima 48px, largura mínima 180px, `rounded-sm`, hover mais escuro ou `accent`.
  - Links: cor `accent` com sublinhado em hover; fallback de fontes (`serif, sans-serif`).
