# Release 1.0 Go-Live Evidence Log

Este arquivo registra apenas evidencias operacionais sem secrets. A janela de
smoke manual ainda nao esta concluida.

## Evidencias Coletadas

- Schema drift Neon corrigido: migrations pendentes aplicadas e
  `npm run test:db` passou com 6/6 testes.
- Ponto tecnico pre-smoke capturado no Neon:
  - timestamp UTC: `2026-05-29T01:40:46.049Z`
  - LSN: `0/1E831E8`
- Backup Nivel 1 local gerado em `/private/tmp/asof-intranet-backup`:
  - arquivo: `asof-intranet-20260529T012758Z.sql.gz`
  - checksum: `asof-intranet-20260529T012758Z.sql.gz.sha256`
  - `gzip -t`: OK
- Restore de teste em banco local descartavel:
  - arquivo usado: `asof-intranet-20260529T012758Z.sql.gz`
  - checksum: OK
  - banco restaurado: `asof_restore_test_20260529014133`
  - resultado: OK, banco descartado apos validacao
  - contagens agregadas:
    - `activities`: 0
    - `admins`: 1
    - `associates`: 0
    - `audit_logs`: 2
    - `domain_events`: 0
    - `legal_consultations`: 0
    - `monthly_payments`: 0
    - `notifications`: 0
    - `oficios`: 0
- Crons sem bearer:
  - `/api/v1/events/dispatch?limit=1`: HTTP 401
  - `/api/v1/juridico/sla-warnings?limit=1`: HTTP 401
- Checagens publicas nao autenticadas em producao:
  - `/login`: HTTP 200
  - `/app`: HTTP 307 para `/login`
  - `/api/v1/health`: HTTP 401
- Deploy de producao inspecionado como candidato a "ultima conhecida boa":
  - id: `dpl_CH4U5cEtpSHVZau2vJbQehRvEmsC`
  - status: Ready
  - alias: `https://intranet.asof.com.br`
  - criado em: `2026-05-28 16:05:28 -03:00`

## Pendencias

- Executar smoke manual autenticado em producao.
- Validar os dois crons com `CRON_SECRET` real carregado em canal seguro.
- Confirmar `history_retention` Neon cobrindo a janela + 24h no console Neon.
- Confirmar formalmente com o owner se o deploy
  `dpl_CH4U5cEtpSHVZau2vJbQehRvEmsC` e a versao "ultima conhecida boa" para
  rollback.
- Confirmar canal unico de incidente e owners de janela.
- Instalar o backup operacional permanente na VPS/host escolhido com env externo
  ao Git.
- Registrar limpeza dos dados `SMOKE_*` apos o smoke, preservando auditoria.
