# ASOF Intranet — Contexto de Negócio

Este documento descreve os termos de domínio e regras de negócio da Intranet da ASOF (Associação Nacional dos Oficiais de Chancelaria).

## Glossário do Domínio

### Secretaria e Documentação

#### Ofício

Documento oficial de comunicação institucional seguindo o **Padrão Ofício** (Manual de Redação da Presidência da República). Utilizado para comunicações formais entre a ASOF e órgãos externos (MRE, Embaixadas, etc).

- **Identificação**: Composta por `NOME DO DOCUMENTO No [número]/[ano]/[setor]`.
- **Partes**: Cabeçalho, Identificação, Local/Data, Endereçamento (Destinatário, Cargo, Vocativo), Assunto, Texto (Introdução, Desenvolvimento, Conclusão), Fecho e Identificação do Signatário.

#### Signatário

A autoridade que assina e expede o documento.

- **Campos**: Nome (em maiúsculas) e Cargo (apenas iniciais maiúsculas).

#### Fecho (Closure)

Saudação final obrigatória.

- **Respeitosamente**: Para autoridades de hierarquia superior.
- **Atenciosamente**: Para autoridades de mesma hierarquia ou inferior.

#### Status de Ofício

Status do ofício no ciclo de vida: `gerado`, `cancelado`, `rascunho`. Campo: `officialLetterStatus`.

#### Tipo de Lotação

Classificação do posto: `domestic` (Brasília/SERE) ou `abroad` (posto no exterior). Campo: `assignmentType`. Tabela: `assignments`.

---

### Associados e Cadastro

#### Associado

Membro da ASOF representado na tabela `associates`. Possui dados pessoais, funcionais e associativos.

#### Lotação

Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE"). Campo: `assignment`.

#### Posto

Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília.

#### Padrão / Classe

Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões. Campo: `classPattern`.

#### Situação Associativa

Status do associado na ASOF: `ativo`, `inativo`. Campo: `associationStatus`.

#### Situação Funcional

Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca`. Campo: `functionalStatus`.

#### Contribuição

Status de pagamento da anuidade ASOF: `em_dia`, `inadimplente`, `pendente_migracao`. Campo: `contributionStatus`.

#### SIAPE

Número de matrícula do servidor federal. Campo: `siape`.

---

### Financeiro

#### Mensalidade

Registro mensal de pagamento de associado. Campo: `monthly_payments`.

#### Método de Pagamento

Forma de quitação da mensalidade: `folha`, `boleto`, `pix`, `transferencia`, `outros`. Campo: `paymentMethod`.

#### Status de Pagamento

Situação da mensalidade: `pago`, `pendente`, `atrasado`, `isento`, `cancelado`. Campo: `paymentStatus`.

Nota: não confundir com `contributionStatus` (campo `contribution_status` na tabela `associates`), que representa o status derivado de contribuição do associado: `em_dia`, `inadimplente`, `pendente_migracao`.

#### Inicialização de Mês

Processo de criar registros de mensalidade para todos os associados ativos de um determinado mês/ano. Disparado manualmente por admin/diretoria.

---

### Jurídico

#### Consulta Jurídica

Solicitação de atendimento jurídico feita por associado. Possui número interno sequencial, status, e histórico de notas.

#### Processo Jurídico

Caso jurídico mais estruturado (Fase 2 do módulo). Relaciona-se a pareceres e notas.

- **Status** (`legalProcessStatus`): `ativo`, `concluido`, `suspenso`.
- **Tipo** (`legalProcessType`): `judicial`, `administrativo`.
- **Subtipo** (`legalProcessSubtype`): `justica_federal`, `stf`, `mre`, `cgu`, `tcu`.

#### Status de Consulta Jurídica

Ciclo de vida da consulta: `aberta`, `aguardando_escritorio`, `respondida`, `arquivada`. Campo: `legal_consultation_status`.

#### Parecer

Opinião jurídica formal emitida pela assessoria jurídica da ASOF. Pode ser vinculada a um processo.

---

### Atividades Administrativas

#### Atividade (Kanban)

Tarefa administrativa no board Kanban. Possui status (`a_fazer`, `em_andamento`, `aguardando_terceiros`, `concluido`), prioridade, responsável e associado relacionado.

#### Quick Add

Criação rápida de atividade diretamente no board, sem abrir formulário completo.

---

### Notificações e Eventos

#### Notificação

Alerta em tempo real para o usuário sobre reatribuição de atividades ou atualização de consulta jurídica. Entregue via Supabase Realtime. Tipos (`notificationType`): `activity.completed`, `legal_consultation.answered`, `activity.assigned`, `legal_consultation.sla_warning`.

#### Evento de Domínio

Registro imutável de algo que aconteceu no sistema (`associate.updated`, `legal_consultation.created`, etc.). Persistido em `domain_events` e disponível para dispatch outbound via webhooks.

#### Webhook Outbound

Envio HTTP assíncrono de eventos de domínio para sistemas externos. Assinado com HMAC SHA-256.

---

## Regras de Negócio

### Módulo de Ofícios

1. **Numeração Sequencial**: O número do ofício é sequencial e reinicia a cada ano civil (ex: 001/2026, 002/2026).
2. **Imutabilidade de Identificação**: Uma vez gerado o número de um ofício, ele deve ser preservado. Se o ofício for cancelado, o número não deve ser reutilizado para evitar lacunas ou duplicidades na cronologia oficial.
3. **Roles de Acesso**: Operado por `admin`, `diretoria` e `secretaria`.

### Módulo Financeiro

1. **Mensalidades por Mês/Ano**: Cada associado ativo deve ter um registro de mensalidade para cada mês/ano. O registro é criado via inicialização de mês.
2. **Status Derivado**: O status de contribuição do associado (`contributionStatus`) é derivado a partir do histórico de mensalidades pagas/inadimplentes.
3. **Inicialização Idempotente**: Inicializar um mês já existente não deve criar duplicatas.
4. **Roles de Acesso**: `admin` e `diretoria` têm acesso completo; `secretaria` é redirecionada para o dashboard.

### Módulo Jurídico

1. **Número Interno Sequencial**: Consultas jurídicas recebem um número interno sequencial gerado atomicamente dentro de uma transação.
2. **Status Flow**: Uma consulta pode transitar entre status definidos pelo enum `legal_consultation_status` (`aberta`, `aguardando_escritorio`, `respondida`, `arquivada`).
3. **Notas Vinculadas**: Cada interação (nota) deve atualizar o timestamp `last_interaction_at` da consulta/processos.
4. **Roles de Acesso**: `admin` e `diretoria` têm acesso; `secretaria` é bloqueada no layout do módulo.

### Módulo de Associados

1. **PII Criptografada**: CPF, SIAPE, email, telefone, endereço e WhatsApp são criptografados em repouso (AES-256-GCM) com índices cegos HMAC-SHA-256 para busca.
2. **Máscara por Role**: Campos sensíveis são descriptografados apenas para `admin` e `diretoria`; `secretaria` vê máscaras.
3. **Importação em Lote**: Associados podem ser importados via CSV com upsert por CPF/SIAPE.

### Autenticação e Autorização

1. **Supabase Auth**: Sessão gerenciada por cookies server-side via `@supabase/ssr`.
2. **Revalidação Local**: Após validação do Supabase, o sistema consulta a tabela `admins` para verificar `isActive` e `mustChangePassword`.
3. **Rate Limit de Login**: 5 tentativas por email a cada 15 minutos, persistido em PostgreSQL.
4. **Dev Bypass**: `SKIP_AUTH=true` permite desenvolvimento sem autenticação real, mas é ignorado em produção.
5. **Redefinição de Senha**: Administradores podem resetar a senha de outros usuários. A exposição temporária de credenciais geradas no painel administrativo é tratada como um débito técnico documentado no [ADR 005](file:///Users/gabrielramos/projetos/ASOF/intranet/docs/adr/005-temporary-manual-password-reset.md). Como política de segurança de dados, senhas temporárias e links/tokens de recuperação nunca devem ser salvos em logs ou registros de auditoria. A visibilidade do administrador deve ser limitada, a médio prazo, a um token ou link de uso único enviado diretamente por e-mail.

### Auditoria e LGPD

1. **Data Access Logging**: Cada acesso a dados PII (view, export, edit) é registrado em `audit_logs` para compliance com Art. 30/37 da LGPD.
2. **Sanitização de PII**: Logs de erro e payloads de eventos passam por redação automática de dados sensíveis.
3. **View PII-Safe**: `associates_list_view` exclui colunas criptografadas e de hash, fornecendo uma visão segura para listagens.

---

## Integrações

### Autenticação M2M (Dual-Auth)

O sistema suporta dois caminhos de autenticação para APIs:

1. **Env-var Key (Depreciado)**: `ASOF_INTEGRATION_API_KEY` + `ASOF_INTEGRATION_HMAC_SECRET`. Estas variáveis são lidas diretamente de `process.env` em `integrations/config.ts` e não são validadas pelo schema Zod em `env.ts`. O uso deste caminho gera logs de aviso estruturados (`logger.warn`) contendo `User-Agent`, método, rota e `requestId` (com omissão de credenciais). A desativação definitiva ocorre assim que o administrador remover as variáveis de ambiente do painel da Vercel.
2. **Table-backed Key**: Chaves persistidas em `integration_api_keys` com escopos por endpoint.
   - **GET /api/v1/events**: Exige o escopo `events:read`.
   - **POST /api/v1/events**: Exige o escopo `events:write`.
   - **Gerenciamento de Webhooks**: Exige o escopo `webhooks:manage`.
   - **Administração**: Exige o escopo `admin`.
   - **GET /api/v1/health**: Não exige escopo específico, necessitando apenas de uma chave ativa. Aceita também autenticação de sessão com roles `admin` e `diretoria`.
   - **Validação de Cadastro**: A criação ou rotação de chaves via `createApiKeyAction` exige obrigatoriamente a seleção de pelo menos um escopo válido.

### Webhooks Outbound

- Assinatura HMAC SHA-256 por subscription.
- Secrets criptografados em repouso (`secret_ciphertext`).
- Target URLs devem ser HTTPS públicos; localhost e redes privadas são rejeitados.
- Dispatch agendado via Vercel Cron: eventos em `/api/v1/events/dispatch` (diário às 03:00 UTC) e alertas de SLA em `/api/v1/juridico/sla-warnings` (diário às 04:00 UTC).

---

## Eventos de Domínio Suportados

- `legal_consultation.created`
- `legal_consultation.status_changed`
- `associate.updated`
- `monthly_payment.updated`
- `official_letter.created`
- `official_letter.published`

---

## Módulos de Suporte

Além dos módulos de domínio listados acima, o sistema inclui módulos auxiliares em `src/lib/`:

- **`email/`** — Envio de e-mail via Mailjet (index.ts, templates.ts).
- **`search/`** — Busca de associados e atividades (queries.ts).
- **`storage/`** — Operações de Supabase Storage para upload de PDFs de ofícios (client.ts, index.ts).

---

## Contato e Responsabilidades

- **Diretoria Executiva**: Tomada de decisão estratégica, acesso a relatórios e jurídico.
- **Secretaria**: Operação diária (ofícios, atividades, cadastro de associados).
- **Administração TI**: Configuração de usuários, integrações, auditoria e infraestrutura.
