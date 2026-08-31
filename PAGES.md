# PAGES.md — Intranet ASOF

Funcionalidades de cada página e requisitos para que sejam consideradas funcionais.

**Roles:** `admin` · `diretoria` · `secretaria`  
**Convenção de acesso:** `*` = qualquer autenticado · roles listadas = mínimo necessário

---

## Fluxo de autenticação

```mermaid
flowchart TD
    A([Usuário]) --> B{Tem sessão?}
    B -- não --> C[/login]
    B -- sim --> D{mustChangePassword?}
    D -- sim --> E[/change-password]
    D -- não --> F[/app]
    C --> G{Credenciais válidas?}
    G -- não --> C
    G -- sim --> D
    E --> F
    F --> H{Esqueceu a senha?}
    H -- sim --> I[/forgot-password]
    I --> J[/reset-password?token=...]
    J --> C
```

---

## Rotas Públicas

### `/`

Redireciona para `/login` (sem sessão) ou `/app` (com sessão).

**Funcional quando:** o redirect ocorre em < 100 ms sem piscar a página.

---

### `/login`

Autenticação via email + senha.

**Funcionalidades:**

- Validação de credenciais com bcrypt + dummy hash anti-enumeração
- Cookie de sessão `httpOnly` assinado com `SESSION_SECRET`
- Rate limit de 5 tentativas/15 min por IP (bloqueio com mensagem genérica)
- Redirect pós-login para destino original (query `?next=`)

**Funcional quando:**

- [ ] Login com credenciais corretas cria sessão e redireciona para `/app`
- [ ] Credenciais erradas exibem mensagem de erro sem vazar qual campo falhou
- [ ] Após 5 tentativas, exibe mensagem de bloqueio temporário
- [ ] Cookie expira corretamente após período configurado

---

### `/forgot-password`

Solicita token de reset por email.

**Funcionalidades:**

- Aceita email, envia link com token HMAC de uso único
- Resposta genérica independente de o email existir (anti-enumeração)

**Funcional quando:**

- [ ] Email válido registrado: recebe link de reset
- [ ] Email não registrado: resposta indistinguível do caso de sucesso
- [ ] Token expira após 1 hora

---

### `/reset-password`

Redefine senha via token da URL.

**Funcionalidades:**

- Valida token HMAC e expiry
- Aceita nova senha (mín. 8 chars) + confirmação
- Invalida token após uso

**Funcional quando:**

- [ ] Token válido: redireciona para `/login` após redefinição
- [ ] Token expirado ou inválido: exibe erro sem stack trace
- [ ] Reutilização de token: bloqueada

---

### `/change-password`

Troca obrigatória de senha para usuários com `mustChangePassword = true`.

**Funcionalidades:**

- Requer autenticação
- Valida senha atual antes de aceitar nova
- Limpa flag `mustChangePassword` ao concluir

**Funcional quando:**

- [ ] Usuário sem a flag é redirecionado para `/app`
- [ ] Senha atual errada: exibe erro
- [ ] Troca bem-sucedida: redireciona para `/app`

---

## Área Autenticada (`/app/*`)

Todas as rotas abaixo exigem autenticação. Usuário sem sessão é redirecionado para `/login`.

### Mapa de navegação

```mermaid
graph LR
    APP[/app<br/>Dashboard]
    ASSOC[/app/associados]
    ASSOC_ID[/app/associados/id]
    ASSOC_EDIT[/app/associados/id/editar]
    ASSOC_REL[/app/associados/relatorio]
    ATIV[/app/atividades]
    ATIV_NOVA[/app/atividades/nova]
    JUR[/app/juridico]
    JUR_LIST[/app/juridico/consultas]
    JUR_NOVA[/app/juridico/consultas/nova]
    JUR_ID[/app/juridico/consultas/id]
    ETIQ[/app/etiquetas]
    SEARCH[/app/search]
    SEC_OF[/app/secretaria/oficios]
    SEC_OF_NOVO[/app/secretaria/oficios/novo]
    SEC_OF_EDIT[/app/secretaria/oficios/id/editar]
    SEC_DOC[/app/secretaria/documentos]
    SEC_EMAIL[/app/secretaria/emails/gerar]
    CFG[/app/config]
    CFG_USR[/app/config/usuarios]
    CFG_LOT[/app/config/lotacoes]
    CFG_AUD[/app/config/auditoria]
    CFG_WH[/app/config/integracoes/webhooks]
    CFG_API[/app/config/integracoes/api-keys]
    CFG_IA[/app/config/integracoes/ia]
    PRIV[/app/privacidade]

    APP --> ASSOC --> ASSOC_ID --> ASSOC_EDIT
    ASSOC --> ASSOC_REL
    APP --> ATIV --> ATIV_NOVA
    APP --> JUR --> JUR_LIST --> JUR_ID
    JUR_LIST --> JUR_NOVA
    APP --> ETIQ
    APP --> SEARCH
    APP --> SEC_OF --> SEC_OF_NOVO
    SEC_OF --> SEC_OF_EDIT
    APP --> SEC_DOC
    APP --> SEC_EMAIL
    APP --> CFG --> CFG_USR
    CFG --> CFG_LOT
    CFG --> CFG_AUD
    CFG --> CFG_WH
    CFG --> CFG_API
    CFG --> CFG_IA
    APP --> PRIV
```

---

### `/app` — Dashboard

**Acesso:** `*`

**Funcionalidades:**

- KPIs do quadro associativo: total de ativos, inadimplentes, pendentes de migração
- Atividades em aberto, atrasadas e urgentes
- Mini-kanban com contagem por status
- Top regiões de lotação
- Sidebar com perfil do usuário logado

**Funcional quando:**

- [ ] KPIs refletem dados reais do banco (não valores fixos)
- [ ] Atividades urgentes (vencidas) aparecem em destaque
- [ ] Página carrega em < 3 s com dados reais

---

### `/app/associados` — Cadastro de Oficiais

**Acesso:** `*`

**Funcionalidades:**

- Lista paginada (20/pág) de Oficiais de Chancelaria, incluindo associados e não associados à ASOF
- Busca por nome (LIKE escapado), CPF (hash-based exact match) ou SIAPE (hash-based exact match)
- Toggle de modo de busca: Nome / CPF / SIAPE
- Filtros persistidos via query string (`page`, `q`, `searchBy`, `functionalStatus`, `associationStatus`, `contributionStatus`)
- Link para perfil com `returnTo` preservando filtros; link para editar visível apenas para admin/diretoria
- Botão para exportar relatório CSV (redireciona para `/app/associados/relatorio`)

**Funcional quando:**

- [ ] Busca por nome retorna resultados parciais e é insensível a acentos
- [ ] Busca por CPF retorna resultado exato (match por hash blind index)
- [ ] Busca por SIAPE retorna resultado exato (match por hash blind index)
- [ ] Paginação navega corretamente sem perder o filtro de busca
- [ ] Navegação para detalhe/editar preserva filtros via `returnTo`; botão "Voltar" retorna à lista com filtros intactos
- [ ] Usuário `secretaria` não vê o link de edição

---

### `/app/associados/[id]` — Perfil do Associado

**Acesso:** `*`

**Funcionalidades:**

- Dados de identificação: nome, CPF, SIAPE, RG, sexo, estado civil, naturalidade (cidade/UF)
- Endereço completo (logradouro, bairro, cidade, UF, CEP), lotação, classe, situação funcional e contribuição
- Dados administrativos: tipo de missão, origem de carreira, data de admissão, posse e cancelamento, forma de pagamento, membro CEOC/CAOC
- Observações internas (visíveis apenas para `admin`)
- Dependentes: listagem com adição, edição e exclusão inline (admin/diretoria/secretaria)
- Convênios de saúde: listagem com adição, edição e exclusão inline (admin/diretoria/secretaria)
- Atividades vinculadas
- Linha do tempo (adesão, última atualização)
- Botão "Voltar" com `returnTo` preserva filtros da listagem de origem

**Funcional quando:**

- [ ] Todos os dados PII são visíveis para usuários autenticados (política de visibilidade completa)
- [ ] `admin` vê observações internas; demais roles não veem
- [ ] Dependentes: adicionar, editar nome/parentesco, remover (com confirmação)
- [ ] Convênios de saúde: adicionar, editar convênio/datas, remover (com confirmação)
- [ ] ID inexistente retorna página `not-found` (não erro 500)
- [ ] Botão "Voltar" retorna à listagem com filtros preservados

---

### `/app/associados/[id]/editar` — Edição de Associado

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Formulário expandido (17 campos novos): sexo, estado civil, naturalidade (cidade/UF), RG (número, órgão expedidor, UF, data de expedição), bairro, UF do endereço, CEP, tipo de missão, origem de carreira, data de admissão, data de posse, data de cancelamento, forma de pagamento, membro CEOC/CAOC, email secundário
- Validação de CPF, SIAPE, RG, datas e emails
- Observações internas (somente `admin`)
- Auditoria automática ao salvar

**Funcional quando:**

- [ ] Dados inválidos (CPF malformado, email duplicado) bloqueiam o submit com mensagem específica
- [ ] Salvar redireciona para o perfil e exibe feedback de sucesso
- [ ] `secretaria` recebe 403 ao tentar acessar

---

### `/app/associados/relatorio` — Relatório CSV

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Seleção de campos com classificação LGPD visível (37 campos em 3 grupos: Dados pessoais, Endereço, Administrativo)
- Manifesto de exportação com N oficiais no recorte, N campos e N dados pessoais selecionados
- Filtros: situação funcional, associativa, contribuição, mês de aniversário, tipo de missão, origem de carreira, forma de pagamento
- Download CSV com BOM UTF-8, separador `;`, formatação pt-BR (datas dd/MM/yyyy, booleanos Sim/Não, enums com labels)
- Prevenção de injeção de fórmula em células (tab prefix)
- Descriptografia PII: campos sensíveis lidos de colunas ciphertext, nunca de plaintext
- Rate limit: 10 downloads/min por IP
- Audit log automático (LGPD)

**Funcional quando:**

- [ ] CSV gerado abre corretamente em Excel (BOM + separador `;`)
- [ ] Campos não selecionados não aparecem no arquivo
- [ ] 11ª requisição no mesmo minuto retorna 429
- [ ] Dados PII sensíveis são descriptografados do ciphertext (nunca lidos como plaintext)
- [ ] Booleanos aparecem como "Sim"/"Não" em português
- [ ] Datas aparecem no formato dd/MM/yyyy
- [ ] Enums aparecem com labels em português (ex: "Masculino", "Permanente", "Folha")

---

### `/app/atividades` — Quadro Kanban

**Acesso:** `*`

**Funcionalidades:**

- Cards por status: `a_fazer`, `em_andamento`, `aguardando_terceiros`, `concluido`
- Drag-and-drop entre colunas (atualiza posição e status)
- Filtros por responsável e por associado vinculado
- Contagem de cards por prioridade na coluna
- Quick-add de nova atividade inline

**Funcional quando:**

- [ ] Drag-and-drop persiste o novo status após recarregar a página
- [ ] Filtros combinados funcionam (responsável + associado)
- [ ] Card movido para `concluida` registra `completedAt`

---

### `/app/atividades/nova` — Nova Atividade

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Campos: título, descrição, status, prioridade, responsável, associado, data de vencimento
- Vinculação opcional a associado via `AssociatePicker`

**Funcional quando:**

- [ ] Título obrigatório é validado no cliente e no servidor
- [ ] Salvar redireciona para `/app/atividades` com o card visível na coluna correta

---

### `/app/financeiro/mensalidades` — Mensalidades

**Status:** fora da UI do ciclo atual (V2). Issue [#429](https://github.com/prof-ramos/intranet/issues/429). O código permanece; o layout redireciona para `/app` e o item some da sidebar. O histórico de mensalidades no perfil do oficial continua visível.

**Acesso (quando a V2 reabrir):** `admin`, `diretoria`

**Funcionalidades (código retido, sem superfície operacional):**

- Inicialização mensal: cria registros de pagamento para todos os oficiais com vínculo ASOF (`initializeMonthAction`)
- Tabela de pagamentos: status por associado (`em_dia`, `inadimplente`, `isento`)
- KPIs: total recebido, inadimplentes, isentos, taxa de adimplência
- Navegação mês a mês (anterior/próximo)
- Atualização individual de status de pagamento

**Funcional quando:**

- [ ] Inicialização cria exatamente um registro por associado ASOF
- [ ] KPIs somam corretamente (sem dupla contagem)
- [ ] Navegação mensal mantém os dados do mês selecionado

---

### `/app/juridico` — Dashboard Jurídico

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Indicadores: consultas abertas, aguardando escritório, sem atualização > 7 dias, SLA vencendo em 48 h, respondidas no mês
- Lista de ações pendentes (ordenadas por urgência)
- Distribuição visual por status

**Funcional quando:**

- [ ] Contador "SLA vencendo" reflete consultas com `slaDeadline` nos próximos 2 dias
- [ ] Consultas stale (> 7 dias sem nota) aparecem destacadas

---

### `/app/juridico/consultas` — Lista de Consultas

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Paginação (20/pág)
- Busca por título ou número interno
- Filtro por status
- Destaque visual: stale (> 7 dias) e SLA vencido

**Funcional quando:**

- [ ] Busca funciona para número parcial (ex: `JUR-2026`)
- [ ] Filtro de status preserva-se ao navegar entre páginas

---

### `/app/juridico/consultas/nova` — Nova Consulta

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Campos: título, resumo, texto completo, associado, prazo SLA (dias)
- Número interno gerado automaticamente (JUR-YYYY-NNN sequencial)

**Funcional quando:**

- [ ] Número gerado é único e sequencial dentro do ano
- [ ] Prazo SLA calculado como `createdAt + slaDeadlineDays`
- [ ] Salvar redireciona para o detalhe da consulta criada

---

### `/app/juridico/consultas/[id]` — Detalhe de Consulta

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Dados completos da consulta (status, título, texto, associado, SLA)
- Histórico de notas em ordem cronológica
- Formulário para adicionar nova nota
- Atualização de status (dropdown com transições válidas)
- Painel lateral com resumo e SLA

**Funcional quando:**

- [ ] Nova nota aparece imediatamente no histórico após submit
- [ ] Mudança de status persiste após recarregar
- [ ] ID inexistente retorna página `not-found`

---

### `/app/email-triage` — Triagem de E-mails

**Status:** fora da UI do ciclo atual (V2). Issue [#429](https://github.com/prof-ramos/intranet/issues/429). O código e os crons permanecem; o layout redireciona para `/app` e o item some da sidebar.

**Acesso (quando a V2 reabrir):** `admin`, `diretoria`

**Funcionalidades (código retido, sem superfície operacional):**

- KPIs: total de emails, por status, taxa de conclusão
- Tabela paginada (20/pág) com filtros por status, prioridade e busca textual
- Ações em massa: validar, concluir, arquivar
- Classificação automática via Gemini AI (categoria, prazo, risco, ação recomendada)

**Funcional quando:**

- [ ] Filtros combinados (status + prioridade + texto) funcionam juntos
- [ ] Ação em massa atualiza status de todos os itens selecionados
- [ ] Busca textual funciona com blind indexes (não expõe PII em query)

---

### `/app/email-triage/[id]` — Detalhe de Triagem

**Status:** fora da UI do ciclo atual (V2). Mesmo redirect de `/app/email-triage`.

**Acesso (quando a V2 reabrir):** `*` (conteúdo PII visível para todos os autenticados)

**Funcionalidades:**

- Conteúdo completo do email (remetente, assunto, corpo)
- Classificação da IA com campos editáveis
- Observações internas e notas
- Atualização de status e deadline
- Audit log automático de acesso (LGPD)

**Funcional quando:**

- [ ] Audit log registrado a cada acesso ao conteúdo
- [ ] Atualização de status refletida na lista
- [ ] ID inexistente retorna página `not-found`

---

### `/app/etiquetas` — Etiquetas Pimaco

**Acesso:** `*`

**Funcionalidades:**

- Seleção de modelo Pimaco (presets configurados)
- Configuração de layout e conteúdo
- Geração de PDF via rota server-side (`POST /app/etiquetas/gerar`)
- Impressão via browser

**Funcional quando:**

- [ ] PDF gerado tem dimensões corretas para o modelo selecionado
- [ ] Download funciona sem erro 500

---

### `/app/search` — Busca Global

> Implementado em `src/app/app/search/page.tsx`. Busca server-side via `searchParams.q`; resultados agrupados por Associados e Atividades.

**Acesso:** `*`

**Funcionalidades:**

- Busca unificada por associados, oficios e consultas jurídicas
- Resultados agrupados por entidade
- Navegação direta para o item encontrado

**Funcional quando:**

- [ ] Retorna resultados de pelo menos uma entidade para termos válidos
- [ ] Resultados de entidades restritas (ex: jurídico) são filtrados por role

---

### `/app/secretaria/oficios` — Lista de Ofícios

**Acesso:** `admin`, `diretoria`, `secretaria`

**Funcionalidades:**

- Tabela paginada: número, destinatário, data, status
- Filtros por status e período
- Ações: visualizar, baixar PDF, editar, cancelar, **enviar para assinatura**
- Download do PDF gerado (`GET /api/oficios/[id]/download`)
- Badge "Abrir página de assinatura" para ofícios com `assinafy_status = pending_signature` (abre `assinafy_signing_url` em nova aba)
- Botão "Enviar para Assinatura" visível apenas para ofícios com status `gerado` ou `rascunho`

**Funcional quando:**

- [ ] PDF baixado segue o Padrão Ofício com numeração correta (`Ofício nº 001/2026-ASOF`)
- [ ] Ofício cancelado não pode ser editado (botão desabilitado)
- [ ] Botão "Enviar para Assinatura" aparece apenas para status `gerado`/`rascunho`
- [ ] Badge "Abrir página de assinatura" aparece para `pending_signature` e abre em nova aba
- [ ] Assinafy não configurado: mensagem de erro adequada (não 500)

---

### `/app/secretaria/oficios/novo` — Novo Ofício

**Acesso:** `admin`, `diretoria`, `secretaria`

**Funcionalidades:**

- Campos: destinatário, cargo, vocativo, assunto, setor Itamaraty
- Editor rich text para o corpo
- Fecho e signatário
- Número sequencial automático (`Ofício nº NNN/YYYY-ASOF`)
- Sugestão de texto via IA Gemini (opcional, requer configuração)
- Validação de impessoalidade client-side (warnings para primeira pessoa, coloquialismos)

**Funcional quando:**

- [ ] Número gerado é único e sequencial
- [ ] Salvar sem IA configurada funciona normalmente (IA é opcional)
- [ ] Campos obrigatórios validados antes do submit
- [ ] Warnings de impessoalidade aparecem mas não bloqueiam envio

---

### `/app/secretaria/oficios/[id]/editar` — Editar Ofício

**Acesso:** `admin`, `diretoria`, `secretaria`

**Funcionalidades:**

- Mesmo formulário do novo, com dados preenchidos
- Apenas ofícios com status não-cancelado podem ser editados
- Validação de impessoalidade client-side

**Funcional quando:**

- [ ] Ofício cancelado retorna 404/not-found ao tentar editar
- [ ] Salvar redireciona para a lista com dados atualizados
- [ ] Warnings de impessoalidade aparecem mas não bloqueiam envio

---

### `/app/secretaria/documentos` — Documentos Institucionais

**Acesso:** `admin`, `diretoria`, `secretaria`

**Funcionalidades:**

- Upload com categorias: contrato, ata, oficio, rh, estatuto, etc.
- Lista paginada com busca por nome e filtro por categoria
- Download com URL assinada (expiração configurável)
- Exclusão com confirmação
- Vinculação opcional a entidade (associado, ofício, consulta)

**Funcional quando:**

- [ ] Upload de arquivo > 10 MB rejeita com mensagem clara
- [ ] URL de download expira após o período configurado
- [ ] Exclusão remove o arquivo do storage e o registro do banco

---

### `/app/secretaria/emails/gerar` — Gerador de E-mails com IA

**Acesso:** `admin`, `secretaria`

**Funcionalidades:**

- Seleção de tipo de email
- Prompt livre para instruções à IA (Gemini)
- Geração de assunto + corpo HTML
- Rate limit: integrado ao rate limiter por IP
- Requer `NEXT_PUBLIC_AI_ENABLED = true` e Gemini configurado

**Funcional quando:**

- [ ] Gemini não configurado: exibe mensagem de erro adequada (não 500)
- [ ] Resposta da IA exibe preview antes de qualquer envio
- [ ] Erros da API Gemini retornam mensagem genérica (sem vazar detalhes internos)

---

### `/app/config` — Hub de Configurações

**Acesso:** `admin`

Cards de navegação para sub-módulos: Usuários, Lotações, Auditoria, Webhooks, API Keys, IA.

**Funcional quando:**

- [ ] `diretoria` e `secretaria` recebem 403 ao tentar acessar

---

### `/app/config/usuarios` — Usuários Administrativos

**Acesso:** `admin`

**Funcionalidades:**

- Lista de admins: nome, email, role, status ativo/inativo
- Reset de senha (gera senha temporária, força `mustChangePassword`)
- Ativação/desativação de conta
- Audit log de todas as ações

**Funcional quando:**

- [ ] Admin não pode desativar a própria conta
- [ ] Senha temporária exige troca no próximo login

---

### `/app/config/lotacoes` — Lotações

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Cadastro com nome e tipo (`domestic`/`abroad`)
- Edição e ativação/desativação
- Validação de nome duplicado

**Funcional quando:**

- [ ] Nome duplicado bloqueado com mensagem específica
- [ ] Lotação desativada não aparece no `AssociatePicker`

---

### `/app/config/auditoria` — Auditoria

**Acesso:** `admin`, `diretoria`

**Funcionalidades:**

- Consulta paginada (50/pág) de `audit_logs`
- Filtros por ação, tipo de entidade e intervalo de datas
- Timestamps exibidos em `America/Sao_Paulo`

**Funcional quando:**

- [ ] Filtros combinados reduzem corretamente o conjunto de resultados
- [ ] Registro de ações sensíveis (edição de associado, reset de senha) está presente

---

### `/app/config/integracoes/webhooks` — Webhooks

**Acesso:** `admin`

**Funcionalidades:**

- Lista de subscriptions com URL e status
- Criação com `targetUrl` HTTPS pública (validação SSRF)
- Rotação de segredo HMAC
- Ativação/desativação

**Funcional quando:**

- [ ] URL privada (RFC-1918, localhost) é rejeitada na criação
- [ ] Segredo exibido apenas uma vez após criação/rotação

---

### `/app/config/integracoes/api-keys` — API Keys

**Acesso:** `admin`

**Funcionalidades:**

- Criação com escopos: `events:read`, `events:write`, `webhooks:manage`, `admin`
- Exibição única do segredo após criação
- Rotação e desativação

**Funcional quando:**

- [ ] Segredo não recuperável após fechar o modal de criação
- [ ] Chave desativada retorna 401 nas APIs

---

### `/app/config/integracoes/ia` — Configuração de IA

**Acesso:** `admin`

**Funcionalidades:**

- Status da integração Gemini (chave configurada ou não)
- Indicador visual de saúde

**Funcional quando:**

- [ ] Com `GEMINI_API_KEY` ausente: exibe aviso claro
- [ ] Com chave configurada: exibe status ativo

---

### `/app/privacidade` — Política de Privacidade

**Acesso:** `*`

Exibe política LGPD e canal de contato para exercício de direitos do titular.

**Funcional quando:**

- [ ] Página carrega sem erro para qualquer role autenticada

---

## APIs e Route Handlers

### Fluxo de integrações

```mermaid
sequenceDiagram
    participant C as Cliente M2M
    participant API as Intranet API
    participant DB as PostgreSQL
    participant WH as Webhook Targets

    C->>API: POST /api/v1/events (API Key)
    API->>API: Autenticação + Rate limit
    API->>DB: Cria domain_event (outbox)
    API->>WH: Dispatch para subscriptions ativas
    WH-->>API: HTTP 2xx / erro
    API->>DB: Registra webhook_delivery
    API-->>C: 200 OK
```

### `GET /api/v1/health`

Health check autenticado para integrações M2M. Requer escopo `health:read` ou role `admin`/`diretoria`.

**Funcional quando:** retorna `{ status: "ok" }` com 200 em < 500 ms.

---

### `GET|POST /api/v1/events`

- `GET`: lista domain events pendentes
- `POST`: dispara eventos por ID ou processa fila pendente

Autenticação: API Key com escopos `events:read` / `events:write`. Rate limit por chave.

**Funcional quando:**

- [ ] Evento dispatched persiste `webhook_delivery` com resultado
- [ ] Evento inexistente retorna 404 estruturado

---

### `POST /api/v1/email-triage/process`

Processa emails da fila Gmail via Gemini AI. Requer `CRON_SECRET`.

**Funcional quando:** classificação persiste no banco e não expõe PII em logs.

---

### `GET /api/v1/cron/gmail-watch`

Renova subscription Gmail Watch (cron). Requer `CRON_SECRET`.

---

### `GET /api/v1/cron/lgpd-retention`

Executa rotina de retenção LGPD (anonimização/exclusão de dados vencidos). Requer `CRON_SECRET`.

**Funcional quando:** registros além do período de retenção são anonimizados sem falha silenciosa.

---

### `GET /api/v1/juridico/sla-warnings`

Emite notificações de SLA vencendo para consultas jurídicas. Requer `CRON_SECRET`.

**Funcional quando:** emite ao menos uma notificação por consulta com SLA em < 48 h, sem duplicatas.

---

### `POST /api/v1/gmail-webhook`

Recebe push notifications do Gmail (Pub/Sub). Valida payload e enfileira para triagem.

---

### `POST /api/v1/events/dispatch`

Endpoint alternativo para disparo manual de domain events.

---

### `POST /app/etiquetas/gerar`

Gera PDF de etiquetas Pimaco. Requer autenticação + role `admin`/`diretoria`/`secretaria`.

**Funcional quando:** PDF com dimensões corretas para o preset retornado em < 5 s.

---

### `GET /api/oficios/[id]/download`

Download do PDF de um ofício. Requer autenticação.

**Funcional quando:** PDF gerado segue o Padrão Ofício; ofício cancelado retorna 404.

---

### `POST /api/webhooks/assinafy`

Recebe eventos do serviço de assinatura digital Assinafy. Valida `X-Webhook-Secret` (HMAC SHA-256).

**Eventos suportados:** `document_signed`, `signer_signed_document`, `document_rejected`, `document_expired`, `document_cancelled`, `document_failed`, `document_ready`, `signer_declined`, `signer_viewed`, `assignment_created`, `assignment_completed`

**Processamento (transacional):**

1. Mapeia status Assinafy → `oficios.assinafyStatus`
2. Early return se status inalterado (idempotência)
3. Atualiza `oficios` com novo status + timestamp
4. Loga `audit_logs` (`action: assinafy_webhook`, `executor: tx`)
5. Emite `domain_events.official_letter.status_changed`
6. Cria `notifications.oficio.status_changed` para **todos admins ativos** (`actorId: null`)

**Funcional quando:**

- [ ] Payload inválido ou secret errado retorna 401 sem processar
- [ ] Status idêntico = early return (sem duplicatas)
- [ ] Notificação criada para todos admins ativos dentro da transação
- [ ] Auditoria logada dentro da transação
- [ ] Signatários existentes na Assinafy: fallback silencioso via GET /signers

---

## Requisitos Transversais

Estes requisitos se aplicam a todas as páginas e APIs:

| Requisito            | Critério                                                                                |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Autenticação**     | Qualquer rota `/app/*` sem sessão redireciona para `/login`                             |
| **Autorização**      | Role insuficiente retorna 403 (não 404 ou 500)                                          |
| **Error boundaries** | Toda rota tem `error.tsx`; erros não expõem stack trace no browser                      |
| **Not-found**        | Rotas dinâmicas com ID inválido têm `not-found.tsx`                                     |
| **PII em logs**      | Nenhum CPF, email, SIAPE em texto plano em `stdout`/`stderr`                            |
| **Audit log**        | Criação, edição e exclusão de associados, usuários, ofícios e consultas são registrados |
| **Acessibilidade**   | Formulários com `label` associado; navegação por teclado funcional                      |
| **Performance**      | Páginas com dados reais carregam em < 3 s em conexão 4G                                 |
