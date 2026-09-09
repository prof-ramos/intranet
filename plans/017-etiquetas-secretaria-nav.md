# Plan 017: Add Etiquetas to the Secretaria navigation (or document URL-only)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/components/Sidebar.tsx src/components/Sidebar.test.tsx e2e/tests/secretaria.spec.ts PAGES.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/482

## Why this matters

`src/app/app/etiquetas/` is a complete Pimaco/PDF flow. Campaigns of mala direta already generate labels. The sidebar Secretaria group (`Sidebar.tsx:141-181`) lists Pesquisa de oficiais, Ofícios, Contatos Gmail, E-mails com IA, Relatórios — **not** Etiquetas. Operators must remember `/app/etiquetas`. This plan adds a Secretaria item. Do not build a second label generator. Do not un-hide Financeiro.

**Default product choice (execute this unless STOP):** add `href: '/app/etiquetas'` labeled `Etiquetas` in the Secretaria `NavGroup` `items` array, visible to `admin`, `diretoria`, and `secretaria` (same as Ofícios). Place it after Ofícios and before Contatos Gmail.

## Current state

- `src/components/Sidebar.tsx` — Secretaria `items` as listed above; `Mala direta` is a sibling `NavLink` at `/app/mala-direta`.
- `src/components/Sidebar.test.tsx` — asserts section order and that Triagem/Financeiro are hidden.
- Etiquetas PDF route already uses `requireRole(['admin', 'diretoria', 'secretaria'])` (`src/app/app/etiquetas/gerar/route.ts`).

**Conventions**

- Sidebar tests: jsdom, `usePathname` mock, `getByRole('link', { name })`.
- Domain word is **Etiquetas** (Portuguese). Do not name the item “Labels”.
- `PRODUCT.md`: scan speed, no decorative nav. One extra item is enough.
- E2E: `e2e/tests/secretaria.spec.ts` — update if it enumerates Secretaria links.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/components/Sidebar.test.tsx` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/components/Sidebar.tsx`
- `src/components/Sidebar.test.tsx`
- `e2e/tests/secretaria.spec.ts` only if it lists nav items
- `PAGES.md` / `docs/dashboard-operational-navigation-spec.md` if they list Secretaria children (grep `etiquetas`)

**Out of scope**:
- Changing Pimaco PDF generation.
- Merging `/app/etiquetas` into mala-direta campaign UI (larger product change).
- Financeiro / email-triage nav (#429).

## Git workflow

- Branch: `feat/issue-<N>-etiquetas-secretaria-nav`
- Commit: `feat(nav): incluir Etiquetas no grupo Secretaria`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Nav item

In the Secretaria `items` array, add:

```ts
{
  href: '/app/etiquetas',
  label: 'Etiquetas',
  icon: <FileSpreadsheet size={18} />, // or a lucide icon already imported; do not add a new dep
},
```

Use an icon already imported in `Sidebar.tsx` if `FileSpreadsheet` is too ofício-like; `Mail` is wrong. If `Tag` / similar is not imported, either import from `lucide-react` (already a dependency) or reuse `FileSpreadsheet`.

### Step 2: Tests + docs

- `Sidebar.test.tsx`: `expect(screen.getByRole('link', { name: 'Etiquetas' })).toBeDefined()` for admin; still no Financeiro/Triagem.
- If diretoria-only hiding is required — it is **not**; etiquetas route allows diretoria.
- Grep `PAGES.md` for Secretaria nav; add Etiquetas if the list is meant to be complete.

**Verify**: `npx vitest run src/components/Sidebar.test.tsx`

## Test plan

- Sidebar unit as above.
- No new e2e unless secretaria.spec asserts an exact link list (then add Etiquetas).

## Done criteria

- [ ] Secretaria group contains Etiquetas → `/app/etiquetas`
- [ ] Sidebar unit tests pass; Financeiro/Triagem still absent
- [ ] lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Product decision was URL-only (you find a comment/ADR saying etiquetas must stay off nav). Then do not add the link; instead add one sentence to `PAGES.md` that the URL is intentional. That still completes the plan.
- Adding the item requires a new NavGroup redesign. STOP; this is a one-line item.

## Maintenance notes

- Campaigns already generate labels; standalone page is for ad-hoc Pimaco. Do not delete `/app/etiquetas` in this PR.
- Reviewer: role visibility must match `etiquetas/gerar` `requireRole`.
