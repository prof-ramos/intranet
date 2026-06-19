# ADR 017: Limpeza De Governança Neon Pós-Reset Pré-Go-Live

Status: accepted
Data: 2026-06-18

## Contexto

Após o reset pré-go-live do `main` (ADR 016), o projeto Neon `intranet-db`
acumulou branches e um projeto paralelo que representavam estados descartados ou
redundantes:

- `vercel-dev` (`br-wild-dew-aceq270e`) tinha `parent_timestamp` de
  2026-06-17T17:06:35Z, **anterior** ao reset ADR 016 (2026-06-18 ~19:14).
  Mantinha ciphertexts de PII criptografados com a chave antiga indisponível —
  estado ilegível/stale, embora ainda ocupasse ~46,5 MB de storage lógico e
  tivesse ~967 s de compute acumulado.
- `dev/migration-test` (`br-fancy-mud-ac20oabm`) era branch descartável de
  ensaio de migration, já cumprida.
- `backup/pre-reset-20260618T191453Z` (`br-lucky-dream-acpymdjj`) preservava o
  estado pré-reset descartado pelo ADR 016 (ciphertexts sem chave).
- Projeto paralelo `neon-aqua-chair` (`shy-frog-84585644`) — vazio, criado por
  console, em região diferente (`aws-us-east-1`) do projeto oficial
  (`aws-sa-east-1`).
- Credenciais expostas em sessão anterior: API key `napi_0cmv74hlnn1x...`
  (controle sobre toda a org, incluindo `main` produção) e senha do role
  `neondb_owner` do `vercel-dev` (`npg_...`).

O projeto roda no Neon Free Tier, que limita branches a 10/projeto, storage a
0,5 GB e impõe scale-to-zero forçado em computes idle. Branches persistentes
sem compute são baratas (só storage COW), mas branches com estados inválidos
consomem quota de storage sem valor.

## Decisão

Executar limpeza de governança alinhada ao ADR 016 e à matriz oficial
(`docs/environments.md`), decidida pelas melhores práticas de Free Tier e
segurança:

1. **Resetar `vercel-dev` para `main`** via `neonctl branches reset vercel-dev
   --parent` — descarta o estado pré-reset ilegível e alinha o branch ao `main`
   limpo. O branch é **mantido** (não excluído): o Free Tier scale-to-zero torna
   branches idle baratos, e `vercel-dev` permanece o slot "Dev realista
   restrito" da matriz para reuso futuro após a importação oficial pré-go-live,
   conforme ADR 016 ("associados reais não devem ser reintroduzidos no banco de
   desenvolvimento diário até a importação oficial").
2. **Excluir `dev/migration-test`** — branch descartável cumprida.
3. **Excluir `backup/pre-reset-20260618T191453Z`** — estado descartado pelo
   ADR 016. O dump local `backups/neon/pre-reset-main-20260618T191518Z.sql.gz`
   (ignorado pelo Git) preserva o estado em disco como última linha de
   recuperação, então a exclusão não perde irrecuperavelmente o estado pré-reset.
4. **Manter `backup/post-clean-main-20260618T2032Z`** (`br-snowy-pond-aco6w55i`)
   — rollback net pós-smoke até o go-live estabilizar, depois revisitar.
5. **Excluir `neon-aqua-chair`** — projeto vazio em região divergente.

### Rotação de credenciais (pendente, exige console)

A organização Neon é "managed by Vercel" (Vercel Storage Integration), o que
restringe `neonctl`/API para operações de projeto; rotação de API keys pessoais
e de senha de role só é executável no console Neon. Itens obrigatórios
pendentes, por ordem de urgência:

- **Revogar a API key `napi_0cmv74hlnn1x...`** no console Neon
  (Organization → API keys). É o item mais urgente: concede controle sobre toda
  a org, incluindo `main` produção. A autenticação `neonctl auth` (OAuth) já
  criou um contexto pessoal novo independente dessa key.
- **Rotacionar a senha do role `neondb_owner` do `vercel-dev`** (`npg_...`) no
  console Neon e atualizar `DATABASE_URL` do(s) ambiente(s) que apontam para
  `vercel-dev`. Menos urgente: `vercel-dev` não é produção; `main` produção usa
  `ep-empty-cake-ac26vl6w` com credenciais próprias distintas.

## Estado Resultante

Após a limpeza, `intranet-db` tem 3 branches (dentro do limite Free Tier de
10/projeto):

- `main` (`br-bold-bar-acge6h1w`) — primário, banco oficial.
- `vercel-dev` (`br-wild-dew-aceq270e`) — resetado para `main`, estado limpo.
- `backup/post-clean-main-20260618T2032Z` (`br-snowy-pond-aco6w55i`) — rollback
  net, sem compute (cpu_used 0), size 34,9 MB.

## Consequências

- A área de trabalho Neon fica enxuta e sem estados inválidos pré-reset.
- Storage consumido por branches descartados é liberado para a quota Free Tier.
- O dump local permanece a única cópia do estado pré-reset; nunca deve ser
  commitado (LGPD).
- A rotação de credenciais fica como passo manual obrigatório documentado, com
  urgência sobre a API key `napi_...` até o go-live.
- Após go-live estável, reavaliar o `backup/post-clean-main` para descarte.

## Opções Rejeitadas

- **Excluir `vercel-dev` em vez de resetar**: rejeitado porque o Free Tier
  scale-to-zero torna branches idle baratos e a matriz reserva o slot "Dev
  realista restrito" para reuso futuro; excluir exigiria recriar endpoint/role
  depois.
- **Manter `backup/pre-reset`**: rejeitado porque o estado é ilegível (ciphertexts
  sem chave) e o dump local já preserva a última linha de recuperação.
- **Reset destrutivo via Neon API direta com a API key exposta**: rejeitado por
  ironia de segurança e pela restrição "managed by Vercel" no CLI; usado
  `neonctl` com OAuth pessoal.

## Evidência De Execução

- `neonctl branches reset vercel-dev --parent --project-id long-leaf-97822199`:
  `current_state=resetting → ready`, `last_reset_at=2026-06-18T21:15:13Z`,
  `init_source=parent-data`.
- `neonctl branches delete dev/migration-test`: `pending_state=storage_deleted`.
- `neonctl branches delete backup/pre-reset-20260618T191453Z`:
  `pending_state=storage_deleted`.
- `neonctl projects delete shy-frog-84585644`: bloqueado pelo CLI —
  `action restricted; reason: organization is managed by Vercel`. Exclusão
  pendente no console Neon.
- `neonctl branches list`: 3 branches restantes (estado resultante acima).