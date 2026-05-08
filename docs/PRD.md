# ASOF Intranet - Product Requirements Document (PRD)

Este documento define os requisitos técnicos e de design para o desenvolvimento da intranet da **ASOF (Associação de Oficiais de Chancelaria)**.

## 1. Visão Geral do Projeto
Este projeto consiste em uma Intranet customizada para a **ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro)**. A plataforma servirá como o hub central de gestão, comunicação e serviços para os membros da associação.

O sistema deve gerenciar um banco de dados robusto de **Oficiais de Chancelaria**, que são os "clientes" da ASOF, formalmente referidos como **Associados**.

## 2. Objetivos e Funcionalidades Principais
- **Gestão de Associados**: Cadastro e manutenção de uma base de dados SQLite contendo informações detalhadas de cada Oficial de Chancelaria associado.
- **Acessibilidade**: Utilizar componentes semânticos e comportamentos acessíveis (Radix UI).
- **Responsividade**: Interface fluida que funcione em desktops, tablets e smartphones.
- **Escalabilidade**: Arquitetura modular que permita a adição de novas funcionalidades sem dívida técnica excessiva.
- **Performance**: Foco em carregamento rápido e otimização de ativos (fonts, imagens).

## 3. Stack Tecnológica
- **Framework**: [Next.js](https://nextjs.org/) (App Router).
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/).
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/).
- **Componentes de UI**: [daisyUI](https://daisyui.com/) (v5) para estilos rápidos e [Radix UI](https://www.radix-ui.com/) para comportamentos de acessibilidade complexos.
- **Ícones**: [Lucide React](https://lucide.dev/).
- **Banco de Dados**: SQLite/libSQL via Drizzle ORM e `@libsql/client`; SQLite local é apenas para desenvolvimento.
- **Deploy**: [Vercel](https://vercel.com/) com banco libSQL/Turso externo em produção.
- **Padronização**: ESLint e Prettier (com plugin de ordenação de classes Tailwind).

## 4. Identidade Visual e Design System

### 4.1 Tema DaisyUI (ASOF)
A interface deve seguir rigorosamente a paleta de cores e definições abaixo:

```css
@plugin "daisyui/theme" {
  name: "ASOF";
  default: true;
  prefersdark: false;
  color-scheme: "light";
  --color-base-100: #ffffff;
  --color-base-200: #f8fafc;
  --color-base-300: #f1f5f9;
  --color-base-content: #0f172a;
  --color-primary: #040920;
  --color-primary-content: #ffffff;
  --color-neutral: #e7edf4;
  --color-neutral-content: #040920;
  --color-accent: oklch(36.674% 0.051 338.825);
  /* ... demais cores e raios conforme theme.md */
}
```

### 4.2 Tipografia e Tom
- **Títulos/Headers**: `Playfair Display` (Serif, pesos 600/700).
- **Corpo e Botões**: `Inter` (Sans, pesos 400/500).
- **Tom de Voz**: Institucional, claro, direto, voz ativa e sem jargões desnecessários.

## 5. Diretrizes de Canais (Redes Sociais e E-mail)

### 5.1 Social Media
- **Formatos**: Instagram (1:1 ou 4:5), Stories (9:16), LinkedIn (1:1 ou Banner).
- **Segurança**: Respeitar áreas de corte de 160px (topo/base) e 120px (laterais).
- **Imagens**: Aplicar overlay `primary/70` ou `primary/80` para garantir legibilidade de textos sobre fotos.

### 5.2 E-mail (HTML)
- **Largura**: 600–640px.
- **Cores**: Fundo `neutral` ou branco.
- **Botões**: Mínimo 48px de altura, largura 180px, `rounded-sm`.

## 6. Estrutura do Projeto
O projeto deve seguir uma separação clara:
- `/src/app`: Rotas e layouts (App Router).
- `/src/components`: Componentes reutilizáveis (Atom, Molecule, Organism).
- `/src/lib`: Configurações de bibliotecas (DB, API clients).
- `/src/hooks`: Lógica de estado e efeitos reutilizáveis.
- `/docs`: Documentação técnica e guias.

## 7. Acessibilidade e Legibilidade
- Contraste mínimo **AA** (4.5:1).
- Alt text obrigatório em imagens.
- Tracking aberto em selos e CTAs (`tracking-widest`).
- Uso de `lucide` icons em tamanhos de 24–32px.
