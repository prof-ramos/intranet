---
allowed-tools: Read, Write, Edit, Bash
argument-hint: '<field-name> on <table> (e.g. "birthDate on associates")'
description: Add AES-256-GCM encryption + HMAC blind index for a new PII field following the project encryption pattern
---

# Add PII Encryption for: $ARGUMENTS

Follow the project's AES-256-GCM + HKDF encryption pattern from `src/lib/crypto/`.

## Checklist

### 1. Schema changes (Drizzle)

In `src/lib/db/schema/<table>.ts`, add:
- **Plaintext column** (keep for backfill fallback): `<field>: text('<field>')`
- **Ciphertext column**: `<field>Ciphertext: text('<field>_ciphertext')`
- **Blind index** (only if the field needs to be searchable): `<field>Hash: text('<field>_hash')`

Run `/new-migration add <field>Ciphertext and <field>Hash to <table>` to generate the migration.

### 2. Add to SENSITIVE_FIELDS

In `src/lib/associates/lgpd.ts`, add only `'<field>'` (plaintext) to the `SENSITIVE_FIELDS` set.

> **Nota:** Adicione apenas a coluna de plaintext (`'<field>'`) ao `SENSITIVE_FIELDS` durante o período de backfill/fallback,
> para que logs de auditoria e o webhook outbox redactem o valor bruto.
> **Remova `'<field>'` de `SENSITIVE_FIELDS`** assim que o backfill for confirmado em produção e a coluna plaintext for dropada.
> Não adicione `'<field>Ciphertext'` — o ciphertext não é PII legível e não precisa de redaction.


### 3. Update sanitize-pii

In `src/lib/sanitize-pii.ts`, add the field name to the sensitive keys list so audit logs and webhook outbox redact it.

### 4. Encrypt on write

In the repository write function (`createAssociate` / `updateAssociateById`):

```typescript
import { encryptPii, piiBlindIndex } from '@/lib/crypto/pii';

// In the insert/update values:
<field>Ciphertext: await encryptPii(data.<field>),
<field>Hash: data.<field> ? await piiBlindIndex(data.<field>) : null,
```

### 5. Decrypt on read with per-column fallback

In the repository read function:

```typescript
import { decryptPiiField } from '@/lib/crypto/pii';

// In the mapped result:
<field>: await decryptPiiField(row.<field>Ciphertext, row.<field>),
```

This reads ciphertext if present, falls back to plaintext — supports incremental backfill.

### 6. Role-based masking

If this field is sensitive (CPF, SIAPE, phone), gate it with `canViewSensitiveFields(role)` in `getAssociateForEdit`. Return `'***'` for roles that cannot see it.

### 7. Search (if searchable)

Use `piiBlindIndex(searchTerm)` to compute the hash for WHERE clause comparisons. Never compare plaintext to plaintext in queries.

### 8. Backfill

After deploying, run the backfill script template:

```bash
npx tsx scripts/backfill-pii-encryption.ts
```

Add the new field to the backfill script if it isn't already covered.

### 9. Drop plaintext column (deferred)

Once backfill is confirmed complete in production, create a separate migration to drop the plaintext `<field>` column. Do NOT do this in the same migration as the ciphertext column addition.

### 10. Verification

- [ ] `npm run test:db` passes (schema contract)
- [ ] `npm run typecheck` clean
- [ ] No plaintext field value appears in audit logs (check with `lgpd-audit`)
