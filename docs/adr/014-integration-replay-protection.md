# ADR 014: Prevenção de Replay Attack em Integrações via Nonce Store

## Status

Aceito

## Contexto

As integrações M2M da intranet autenticam requisições com HMAC SHA-256 sobre um payload que inclui timestamp. A validação de timestamp (skew máximo configurado via `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS`) reduz a janela de ataque, mas não elimina o risco: dentro dessa janela, qualquer requisição capturada pode ser reenviada com a mesma assinatura HMAC e seria aceita pelo servidor.

Isso é especialmente relevante para rotas de webhook que disparam efeitos colaterais (atualização de status, emissão de domain events, notificações).

## Decisão

Introduzir uma tabela `integration_signature_nonces` com constraint UNIQUE em `(key_id, signature)` e coluna `expires_at`. O fluxo de verificação, implementado em `src/lib/integrations/verify-request.ts` via `checkAndRecordNonce()`, é:

1. Consultar se o par `(key_id, signature)` já existe e não expirou (`expires_at > now()`)
2. Se sim → rejeitar com HTTP 401 e código `integration_replay`
3. Se não → inserir com `onConflictDoNothing` (seguro contra race condition) e prosseguir

`key_id` é derivado de `sha256Hex(rawApiKey)` — a chave em plaintext nunca é persistida.

O TTL do nonce é igual à tolerância de timestamp (`toleranceSec`), garantindo que nonces expirados não ocupem espaço indefinidamente e que a janela de proteção seja consistente com a janela de validade da assinatura.

## Consequências

- **Positivo:** Elimina replay attacks dentro da janela de tolerância de timestamp
- **Positivo:** Overhead mínimo — 1 `SELECT` + 1 `INSERT` por requisição autenticada
- **Positivo:** Race condition segura via `onConflictDoNothing` — a única requisição a inserir o nonce com sucesso é aceita
- **Negativo:** A tabela acumula nonces expirados sem limpeza automática
- **Ação futura:** Criar cron job em `src/app/api/v1/cron/cleanup-nonces/` executando `DELETE FROM integration_signature_nonces WHERE expires_at < now()`; enquanto isso, limpeza manual conforme `docs/runbook.md`
