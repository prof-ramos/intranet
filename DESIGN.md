---
name: ASOF Intranet
colors:
  # Base surfaces (dark scheme, OKLCh space — hex approximations provided)
  base-100: "oklch(14.076% 0.004 285.822)"   # ~#0d0d12 — page background (dark)
  base-200: "oklch(20.219% 0.004 308.229)"   # ~#131318 — sidebar background
  base-300: "oklch(23.219% 0.004 308.229)"   # ~#16161c — dividers, hover states
  base-content: "oklch(75.687% 0.123 76.89)" # ~#c9a85c — warm amber body text

  # Brand navy (Itamaraty identity)
  primary: "#040920"          # deep navy — almost black
  primary-content: "#ffffff"
  primary-dark: "#06284f"     # sidebar background, stat card borders

  # Secondary & accent
  secondary: "oklch(27.581% 0.064 261.069)"  # ~#192440 — dark blue-purple
  secondary-content: "oklch(85.516% 0.012 261.069)"
  accent: "oklch(36.674% 0.051 338.825)"     # ~#3d1530 — dark magenta
  accent-content: "oklch(87.334% 0.01 338.825)"

  # Neutral (light context — used on the public/admin page white surface)
  neutral: "#e7edf4"          # soft blue-grey — table alternates, chip fills
  neutral-content: "#040920"

  # Semantic
  success: "oklch(78.119% 0.192 132.154)"    # ~#4ade80 — active badge fill
  success-content: "oklch(15.623% 0.038 132.154)"
  warning: "oklch(86.127% 0.136 102.891)"    # ~#eab308 — pending badge fill
  warning-content: "oklch(17.225% 0.027 102.891)"
  error: "oklch(71.753% 0.176 22.568)"
  error-content: "oklch(14.35% 0.035 22.568)"
  info: "oklch(79.061% 0.121 237.133)"
  info-content: "oklch(15.812% 0.024 237.133)"

  # Hardcoded UI tokens used in the current build
  surface-white: "#f8fafc"    # main content area background
  surface-card: "#ffffff"     # cards, table container
  active-nav-indicator: "#76AEEA"   # left-border on active sidebar item
  active-nav-bg: "#123d73"    # background of active sidebar item
  badge-active-bg: "#bfe6bd"  # associate status: Ativo
  badge-pending-bg: "#e7c16b" # associate status: Em análise

  # Dashboard — KPI stripe & kanban accents
  hair: "rgba(4, 9, 32, 0.10)"       # hairline divider / card border (same as header-border)
  kanban-a-fazer: "#94a3b8"           # slate — column "A fazer"
  kanban-andamento: "#76AEEA"         # sky — column "Em andamento"
  kanban-aguardando: "#e7c16b"        # amber — column "Aguardando terceiros"
  kanban-concluido: "#86efac"         # green — column "Concluído"

  # Priority tones (text color on kanban cards)
  priority-urgente: "#b91c1c"         # red-700
  priority-alta: "#a16207"            # amber-700
  priority-normal: "rgba(13,31,60,0.7)"
  priority-baixa: "rgba(13,31,60,0.5)"

typography:
  display:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: "700"
    lineHeight: 1
    letterSpacing: "-0.02em"
  heading-xl:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: "700"
    lineHeight: 1
    letterSpacing: "0"
  heading-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.1"
  heading-md:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: "700"
    lineHeight: "1.2"
  nav-item:
    fontFamily: Google Sans
    fontSize: 22px
    fontWeight: "400"
    lineHeight: "58px"
  body-lg:
    fontFamily: Google Sans
    fontSize: 20px
    fontWeight: "400"
    lineHeight: "1.5"
  body-md:
    fontFamily: Google Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontFamily: Google Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
  label:
    fontFamily: Google Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.4"
  caption:
    fontFamily: Google Sans
    fontSize: 11px
    fontWeight: "400"
    lineHeight: "1.4"
    letterSpacing: "0.08em"

spacing:
  unit: 4px
  content-padding-mobile: 20px
  content-padding-tablet: 32px
  content-padding-desktop: 40px
  card-padding: 28px
  sidebar-padding-x: 36px
  sidebar-padding-y: 40px
  section-gap: 40px
  card-gap: 20px
  nav-item-height: 58px

rounded:
  field: 0.5rem    # inputs, small buttons
  selector: 1rem   # dropdowns, chips
  box: 1rem        # cards, table container
  nav-item: 0      # sidebar nav items are flush (rounded-none)

elevation:
  stat-card: "0 4px 0 rgba(4, 9, 32, 0.12)"       # hard bottom drop — official/seal feel
  data-panel: "0 12px 30px rgba(4, 9, 32, 0.08)"  # soft lift for table container
  header-border: "0 1px 0 rgba(4, 9, 32, 0.10)"   # header bottom divider

motion:
  default: "150ms ease"
  hover-opacity: "opacity 150ms ease"

border:
  width: 1px
  stat-card-width: 3px
  active-nav-indicator-width: 6px

components:
  sidebar:
    backgroundColor: "{colors.primary-dark}"
    textColor: "#ffffff"
    width: 320px
    paddingX: "{spacing.sidebar-padding-x}"
    paddingY: "{spacing.sidebar-padding-y}"
  sidebar-brand:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: "700"
  sidebar-nav-item:
    height: "{spacing.nav-item-height}"
    fontSize: 22px
    paddingX: "{spacing.sidebar-padding-x}"
    rounded: "{rounded.nav-item}"
    hoverBg: "{colors.active-nav-bg}"
  sidebar-nav-item-active:
    backgroundColor: "{colors.active-nav-bg}"
    borderLeft: "6px solid {colors.active-nav-indicator}"
  header:
    backgroundColor: "{colors.surface-card}"
    height: 80px
    borderBottom: "1px solid rgba(4, 9, 32, 0.10)"
    position: sticky
    zIndex: 20
  stat-card:
    backgroundColor: "{colors.surface-card}"
    border: "3px solid {colors.primary-dark}"
    shadow: "{elevation.stat-card}"
    padding: "{spacing.card-padding}"
    rounded: "{rounded.box}"
    titleSize: 20px
    valueSize: 60px
    valueFontWeight: "700"
  data-panel:
    backgroundColor: "{colors.surface-card}"
    shadow: "{elevation.data-panel}"
    padding: 24px
    rounded: "{rounded.box}"
  table-header:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    fontSize: 18px
    paddingY: 20px
  badge-active:
    backgroundColor: "{colors.badge-active-bg}"
    textColor: "{colors.neutral-content}"
    rounded: 9999px
    paddingX: 16px
    paddingY: 8px
  badge-pending:
    backgroundColor: "{colors.badge-pending-bg}"
    textColor: "{colors.neutral-content}"
    rounded: 9999px
    paddingX: 16px
    paddingY: 8px
  avatar-initials:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    size: 48px
    rounded: 9999px
    ring: "2px solid rgba(4, 9, 32, 0.15)"
    fontSize: 14px
    fontWeight: "700"

  # Dashboard — Sala de Operações
  kpi-stripe:
    layout: flex (5 equal columns, `flex-1` each)
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hair}"
    rounded: "{rounded.box}"
    divider: "1px solid {colors.hair}" # between columns, left border on cols 2–5
    paddingX: 20px
    paddingY: 16px
    valueSize: 30px
    valueFontFamily: Playfair Display
    valueFontWeight: "700"
    labelSize: 12px (lowercase)
    neg-tone: "{colors.priority-urgente}"   # atrasadas
    pos-tone: "#15803d"                     # contribuições em dia
  kanban-column:
    backgroundColor: "var(--color-base-200)"
    rounded: 1rem       # rounded-2xl
    padding: 12px
    minHeight: 380px
    headerAccent: 8x8px rounded-sm dot, color per status (see kanban-* tokens)
    headerText: 10px uppercase tracking-wider font-bold
    countText: 11px text-base-content/55
  kanban-card:
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hair}"
    shadow: "0 1px 0 rgba(4,9,32,0.04)"
    rounded: 0.75rem    # rounded-xl
    padding: 12px
    titleSize: 14px font-semibold leading-snug
    tagStyle: rounded-full px-2 py-0.5 text-[10px] bg-base-200 border hair
    priorityStyle: 10px uppercase tracking-wider, color per priority tone
    assigneeAvatar: 20x20px rounded-full bg-primary text-[9px] font-bold
  right-rail:
    width: 320px        # fixed at xl breakpoint
    gap: 20px between panels
  alert-panel:
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hair}"
    rounded: "{rounded.box}"
    iconSize: 20px
    iconColor: per tone (neg=priority-urgente, warn=priority-alta, info=primary)
    divider: "1px solid {colors.hair}" between items (not after last)
    titleSize: 14px font-semibold
    bodySize: 12px text-base-content/60 leading-relaxed
  region-bars:
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hair}"
    rounded: "{rounded.box}"
    trackHeight: 4px rounded-full bg-base-200
    fillColor: "{colors.primary}"
    labelSize: 14px font-medium
    valueSize: 14px font-serif font-bold
---

# Design System

## Identidade Visual

A ASOF Intranet carrega a identidade institucional da Associação de Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. O design comunica autoridade diplomática e precisão administrativa — sem abrir mão de clareza e modernidade operacional.

A metáfora central é a do **papel timbrado digital**: fundo branco limpo, tipografia serif de peso em posições de destaque, e uma paleta de marinho-naval que remete às cores do Itamaraty. Cada elemento sinaliza confiabilidade institucional.

## Estratégia de Cores

O sistema opera em dois contextos de superfície:

**Contexto claro (área de conteúdo):** Fundo `#f8fafc` (off-white frio) com cards brancos `#ffffff`. O texto e os elementos estruturais usam `#040920` (marinho quase-preto) com opacidades variáveis — `0.10` para bordas sutis, `0.15` para anéis de avatar, `0.55` para ícones de suporte. Esse gradiente de opacidade cria hierarquia sem introduzir cores adicionais.

**Contexto escuro (sidebar):** Fundo `#06284f` (marinho profundo) com o item ativo em `#123d73` e indicador lateral de `6px` em `#76AEEA` (azul-celeste diplomático). A sidebar é o único elemento com alta saturação — ela ancora visualmente a identidade ASOF em todas as páginas.

**Badges de status** usam verde-pastel (`#bfe6bd`) para "Ativo" e âmbar-pastel (`#e7c16b`) para "Em análise" — ambos com texto preto para garantir contraste WCAG AA. A baixa saturação desses tons evita alarme visual em tabelas densas.

## Tipografia

Dois typefaces, dois papéis distintos:

**Playfair Display** (serif, 600–700) assume os momentos de autoridade: logotipo "ASOF" na sidebar, títulos de página (`h1`), cabeçalhos de seção (`h2`). Seu contraste dramático entre traços finos e grossos evoca documentos oficiais e chancelas. Usado exclusivamente em peso bold — nunca em texto corrido.

**Google Sans** (sans-serif, 400–700) governa toda a interface funcional: navegação, tabelas, labels, inputs, body text. Sua geometria limpa equilibra o exibicionismo do serif sem competir com ele.

A hierarquia funciona por escalonamento radical: o `h1` da página (56–64px) contrasta visualmente com o body text (16–18px), criando uma leitura imediata de "título de relatório" — formato familiar ao público de oficiais de chancelaria.

## Layout e Espaçamento

O layout é bicoluna com sidebar fixa (320px) + área de conteúdo fluida. Em mobile, a sidebar é um drawer sobreposto acionado por hamburger — o padrão DaisyUI `drawer lg:drawer-open`.

O ritmo base é de **4px** (DaisyUI `--size-field`). O padding do conteúdo escala com o viewport: 20px mobile → 32px tablet → 40px desktop. Cards de estatística usam `28px` de padding interno, suficiente para respirar sem desperdiçar espaço em telas de 1024px.

A grid de stat cards usa 4 colunas em `xl`, 2 em `md`, e 1 em mobile — seguindo o padrão DaisyUI stat com `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4`.

## Elevação e Profundidade

A profundidade é comunicada por dois padrões distintos:

**Hard drop (stat cards):** `box-shadow: 0 4px 0 rgba(4,9,32,0.12)` — sombra com deslocamento fixo sem blur. Cria a sensação de um cartão "preso" à superfície, como um carimbo ou lacre. Reforçada pela borda de `3px` em marinho.

**Soft lift (painel de dados):** `box-shadow: 0 12px 30px rgba(4,9,32,0.08)` — sombra difusa de baixa opacidade. A tabela de associados flutua levemente acima do fundo sem chamar atenção para si.

O header usa apenas uma borda inferior `1px` — sem sombra — para manter a superfície plana e discreta.

## Formas e Bordas

O sistema usa `border-radius: 1rem` (16px) para caixas e cards — arredondado o suficiente para ser moderno, contido o suficiente para ser formal. Inputs usam `0.5rem` (8px). Items de navegação na sidebar são **sem arredondamento** (`rounded-none`) e ocupam a largura total — reforçam a leitura de lista de auditoria, não de menu de app consumer.

A borda de `3px` nos stat cards é incomum e intencional: ela equipara visualmente o card ao frame de um documento timbrado.

## Componentes DaisyUI Utilizados

O projeto usa DaisyUI 5 como base de componentes. Todos os elementos de interface devem preferir as classes semânticas do DaisyUI antes de criar CSS customizado.

| Elemento | Classe DaisyUI |
|---|---|
| Sidebar mobile | `drawer` / `drawer-side` / `drawer-overlay` / `lg:drawer-open` |
| Navegação lateral | `menu` / `menu-active` (item ativo) |
| Botões | `btn` / `btn-ghost` / `btn-circle` / `btn-square` |
| Inputs de busca | `input` / `input-bordered` |
| Badge de status | `badge badge-success` / `badge badge-warning` |
| Indicador de notificação | `indicator` / `indicator-item` / `badge` |
| Cards de estatística | `stat` / `stat-title` / `stat-value` / `stat-figure` |
| Tabela | `table` (com `scope="col"` nos `th`) |
| Loading skeleton | `skeleton` (com `h-*` e `w-*`) |
| Toast de feedback | `toast` / `alert alert-success` / `alert alert-error` |
| Modal de confirmação | `modal` / `modal-box` / `modal-action` (elemento `<dialog>`) |
| Avatar com iniciais | `avatar` + `div` com iniciais e `rounded-full` |
| Grupo de botões (paginação) | `join` / `join-item` |
| Dropdown de filtro | `dropdown` / `dropdown-content` / `menu` |
| KPI stripe | `rounded-box bg-base-100` com `flex` e `flex-1` por célula |
| Coluna kanban | `rounded-2xl bg-base-200` — sem classe DaisyUI específica |
| Card kanban | `rounded-xl bg-base-100` com border e shadow inline |
| Barras de região | `rounded-full bg-base-200` (track) + `bg-primary` (fill) |

## Dashboard — Sala de Operações

O dashboard usa um layout de três zonas verticais dentro da área de conteúdo já enquadrada pela Sidebar + Header:

1. **Cabeçalho de página** — eyebrow `text-[11px] uppercase tracking-[0.18em]` com contexto ("Sala de operações · data"), `h1` em Playfair 40–48px, e botões de ação alinhados à direita.

2. **KPI stripe** — faixa horizontal `rounded-box` com 5 células `flex-1`, separadas por hairlines verticais `1px solid rgba(4,9,32,0.10)`. Valores em Playfair 30px bold; label 12px lowercase `text-base-content/65`. Valores negativos (atrasadas) em `#b91c1c`; positivos (contribuições) em `#15803d`.

3. **Grid principal** (`xl:grid-cols-[minmax(0,1fr)_320px]`) — painel kanban à esquerda (largura fluida) e rail lateral fixo de 320px à direita. Em viewports menores que `xl` (1280px) as zonas empilham verticalmente.

**Painel kanban** — `rounded-box bg-base-100` com `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4`. Cada coluna tem um ponto colorido (8×8px `rounded-sm`) que mapeia para o status: slate → a_fazer, sky → em_andamento, amber → aguardando_terceiros, green → concluido. Os cards mostram título, tag de área, prioridade colorida, data e avatar de 2 letras do responsável.

**Rail lateral** — dois painéis `rounded-box bg-base-100` empilhados com `gap-5`:
- *Avisos*: lista de alertas com ícone Lucide de 20px colorido por tom (neg/warn/info), separados por hairlines (exceto o último item).
- *Associados por região*: barras horizontais de 4px de altura, track `bg-base-200`, fill `bg-primary`, label à esquerda e contagem à direita em Playfair 14px bold.

## Voz Visual

Se este sistema fosse um documento físico, seria uma **pasta de protocolo do Itamaraty**: capa azul-marinho, papel branco de alta gramatura, tipografia em Garamond (ou similar serif de prestígio), números em destaque, tabelas com linhas limpas. Digital, mas com a gravidade de quem assina tratados.

O usuário-alvo são oficiais de chancelaria — acostumados a documentos formais, dashboards de governo, e sistemas legados. A intranet deve parecer **mais moderna que o que eles conhecem**, mas nunca frívola. Cada pixel justifica sua presença com clareza funcional ou identidade institucional.
