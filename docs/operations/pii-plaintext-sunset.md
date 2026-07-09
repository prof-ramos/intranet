# Plano: Sunset de PII plaintext em `associates`

**Status:** planejado (não executado)  
**Data:** 2026-07-09  
**Relacionado:** F-008 (`src/lib/associates/pii-mapping.ts`), ADR 006, ADR 016, auditoria 2026-07-09

## Problema

A tabela `associates` ainda possui colunas **plaintext legadas** em paralelo ao
padrão ciphertext + blind index:

| Campo lógico | Plaintext (legado) | Ciphertext                 | Blind index          |
| ------------ | ------------------ | -------------------------- | -------------------- |
| CPF          | `cpf`              | `cpf_ciphertext`           | `cpf_hash`           |
| SIAPE        | `siape`            | `siape_ciphertext`         | `siape_hash`         |
| E-mail       | `primary_email`    | `primary_email_ciphertext` | `primary_email_hash` |
| Telefone     | `phone`            | `phone_ciphertext`         | `phone_hash`         |
| WhatsApp     | `whatsapp`         | `whatsapp_ciphertext`      | `whatsapp_hash`      |
| Endereço     | `address`          | `address_ciphertext`       | `address_hash`       |
| RG           | `rg`               | `rg_ciphertext`            | `rg_hash`            |

Escrita nova já **zera plaintext** e preenche ciphertext/hash (ou clear em blank).
Leitura prefere ciphertext com fallback plaintext. O plaintext residual amplia
superfície LGPD em dumps, backups e acesso SQL direto.

## Objetivo

1. Zero linhas com plaintext PII preenchido quando o ciphertext correspondente existe ou o valor pode ser migrado.
2. Remover colunas plaintext do schema após período de observação.
3. Manter busca por blind index e decrypt controlado na aplicação.

## Fora de escopo

- Troca de `ENCRYPTION_MASTER_KEY` sem re-encrypt (ADR 016).
- Portal do associado / export LGPD automático (ADR 019 permanece manual).
- Campos não-PII (`full_name`, lotação, status).

## Fases

### Fase A — Inventário (baixo risco)

```sql
-- Contagens (produção: somente leitura / janela controlada)
SELECT
  count(*) FILTER (WHERE cpf IS NOT NULL AND btrim(cpf) <> '') AS cpf_plain,
  count(*) FILTER (WHERE cpf_ciphertext IS NOT NULL) AS cpf_cipher,
  count(*) FILTER (WHERE siape IS NOT NULL AND btrim(siape) <> '') AS siape_plain,
  count(*) FILTER (WHERE primary_email IS NOT NULL AND btrim(primary_email) <> '') AS email_plain,
  count(*) FILTER (WHERE phone IS NOT NULL AND btrim(phone) <> '') AS phone_plain,
  count(*) FILTER (WHERE address IS NOT NULL AND btrim(address) <> '') AS address_plain,
  count(*) FILTER (WHERE rg IS NOT NULL AND btrim(rg) <> '') AS rg_plain
FROM associates;
```

- [ ] Rodar inventário em clone autorizado ou produção read-only
- [ ] Registrar totais no canal privado (sem valores de PII)

### Fase B — Backfill (médio risco)

Script dedicado (a criar, ex.: `scripts/backfill-pii-encrypt-remaining.ts`):

1. Para cada coluna: se plaintext não vazio e ciphertext null → `encryptPii` + `piiBlindIndex`, plaintext → null.
2. Se plaintext e ciphertext ambos preenchidos → preferir ciphertext; zerar plaintext (já é o contrato de leitura).
3. Batch + transaction; logar apenas IDs e contagens.
4. Dry-run obrigatório; apply com `ALLOW_PRODUCTION_MIGRATIONS` / flag explícita.

- [ ] Implementar script com dry-run
- [ ] Testes unitários do transform
- [ ] Executar em dev sintético → staging/clone → produção em janela
- [ ] Re-rodar inventário (plain deve tender a 0)

### Fase C — Observação (2–4 semanas)

- [ ] App e relatórios só via decrypt path
- [ ] Smoke + export CSV de amostra
- [ ] Confirmar que buscas por CPF/SIAPE usam hash

### Fase D — Drop de colunas (alto impacto de schema)

Migration Drizzle:

1. `ALTER TABLE associates DROP COLUMN cpf, …` (lista explícita).
2. Atualizar `src/lib/db/schema/associates.ts` e contract tests.
3. Remover referências a `plaintextCol` no mapping (só cipher+hash).
4. Release: **deploy → migrate → smoke** (`docs/runbook.md` §0).

- [ ] PR de schema + mapping
- [ ] Backup Nível 1 + branch Neon pré-migrate
- [ ] Apply + smoke 10/10

## Critérios de pronto

| Critério                      | Evidência                                |
| ----------------------------- | ---------------------------------------- |
| Inventário plain ≈ 0          | Query Fase A                             |
| Creates/updates sem plaintext | Testes + code review mapping             |
| Colunas dropadas em prod      | `__drizzle_migrations` + `\d associates` |
| Busca e relatório OK          | Smoke + teste de relatório               |

## Riscos

| Risco                              | Mitigação                                                  |
| ---------------------------------- | ---------------------------------------------------------- |
| Re-encrypt com chave errada        | Nunca mudar master key no mesmo job                        |
| Relatórios legados lendo plaintext | Auditar `src/lib/reports` e imports                        |
| Rollback após DROP                 | Restore dump/branch; DROP é difícil de reverter sem backup |
| Performance do backfill            | Batches pequenos; `statement_timeout`                      |

## Donos sugeridos

- Execução técnica: owner app/DB (ADR 011)
- Aceite LGPD: Diretoria / DPO acumulado
- Não executar Fase D sem aceite explícito

## Referências de código

- `src/lib/associates/pii-mapping.ts` — F-008
- `src/lib/crypto/pii.ts` — encrypt / blind index
- `src/lib/associates/service.ts` — create/update
- `docs/runbook.md` — release e backup
