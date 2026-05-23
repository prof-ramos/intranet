---
allowed-tools: Read, Bash, Grep, Glob
argument-hint: '[module-path] | --full'
description: Audit LGPD/PII compliance for a module or the full codebase — checks encryption, sanitization, access logging, and data exposure risks
---

# LGPD / PII Compliance Audit

Audit target: **$ARGUMENTS** (omit for full codebase scan)

## What to check

### 1. PII fields handled correctly

Scan for plaintext PII storage or logging:

```
!grep -rn "cpf\|siape\|email\|phone\|whatsapp\|address\|telefone\|celular\|mobile\|endereco\|logradouro\|cep\|rg\|documento\|passaporte" src/ --include="*.ts" --include="*.tsx" | grep -v "cipher\|hash\|Hash\|encrypt\|decrypt\|blind\|test\|spec\|\.d\.ts" | grep -v "node_modules"
```

> **Nota:** Esta regex cobre termos comuns de PII em português, mas uma auditoria manual completa deve considerar contextos específicos do domínio (ex.: campos em nomes de arquivos, metadados de documentos, logs de integração).

Verify that all PII columns have:
- A corresponding `*Ciphertext` column in the schema
- A `*Hash` blind-index column for any searchable fields
- Usage of `encryptPii` / `decryptPii` from `src/lib/crypto/pii.ts`
- Per-column fallback in repository reads: `decryptPiiField(row.cpfCiphertext, row.cpf)`

Check `SENSITIVE_FIELDS` in `src/lib/associates/lgpd.ts` includes all new PII fields.

### 2. No plaintext PII in audit logs or domain events

```
!grep -rn "logAudit\|createAuditLog\|dispatchDomainEvent" src/ --include="*.ts" | head -20
```

Confirm that `sanitizePiiValue()` from `src/lib/sanitize-pii.ts` is applied to any payload before it reaches `audit_logs` or `domain_events`. Check both:
- `src/lib/audit/service.ts`
- `src/lib/integrations/outbox.ts`

### 3. Data access logging present

```
!grep -rn "logDataAccess" src/ --include="*.ts" | grep -v "test\|spec"
```

Every Server Action or query function that returns PII fields to a user must call `logDataAccess()` (LGPD Art. 30/37 compliance). Flag any `getAssociate*` or similar functions that return PII without a `logDataAccess` call.

### 4. No PII in API responses or error messages

```
!grep -rn "console\.log\|console\.error\|logger\." src/ --include="*.ts" | grep -i "cpf\|siape\|email\|phone\|password\|token\|secret" | grep -v "test\|spec"
```

Verify logger calls use `createLogger("module")` from `src/lib/logger.ts` which has built-in PII redaction.

### 5. Role-based PII masking in place

Check that `canViewSensitiveFields(role)` gates PII visibility in:
- `src/lib/associates/repository.ts` — `getAssociateForEdit`
- Any new associate detail endpoints

### 6. Supabase service-role key never exposed to client

```
!grep -rn "SUPABASE_SERVICE_ROLE\|service_role" src/ --include="*.ts" --include="*.tsx" | grep -v "server-only\|lib/supabase/admin"
```

`src/lib/supabase/admin.ts` must be the only file importing the service role key, and it must import `server-only`.

### 7. Report

For each finding, report:
- **File:line** reference
- **Severity**: Critical (plaintext PII exposed) / High (missing encryption) / Medium (missing access log) / Low (style/convention)
- **Fix**: specific change required
