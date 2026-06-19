# ASOF Intranet — Contexto de Negócio

Este documento descreve os termos de domínio e regras de negócio da Intranet da ASOF (Associação Nacional dos Oficiais de Chancelaria).

## Glossário do Domínio

### Secretaria e Documentação

#### Ofício

Documento oficial de comunicação institucional seguindo o **Padrão Ofício** (Manual de Redação da Presidência da República). Utilizado para comunicações formais entre a ASOF e órgãos externos (MRE, Embaixadas, etc).

- **Identificação**: Composta por `Ofício nº [número]/[ano]-ASOF`.
- **Partes**: Cabeçalho, Identificação, Local/Data, Endereçamento (Destinatário, Cargo, Vocativo), Assunto, Texto (Introdução, Desenvolvimento, Conclusão), Fecho e Identificação do Signatário.
- **Arquivamento**: O Ofício é criado e numerado pela intranet; seu PDF final ou assinado pode ser arquivado como Documento para consulta futura.

#### Assinatura Digital (Assinafy)

Plataforma de assinatura eletrônica integrada à intranet para assinatura de ofícios.

- **Fluxo**: Ofício (status `gerado`/`rascunho`) → Geração PDF → Upload Assinafy → Criação Signatário → Assignment (30 dias) → Persistência `assinafy_signing_url` → Email ao signatário → Webhook callbacks (`document_signed`, `signer_signed_document`, `document_rejected`, etc.) → Atualização status + notificação admins
- **Status Assinafy** (`assinafy_document_status`): `uploading`, `uploaded`, `metadata_processing`, `metadata_ready`, `pending_signature`, `certificating`, `certificated`, `expired`, `partially_signed`, `rejected_by_signer`, `rejected_by_user`, `failed`
- **Campos persistidos**: `assinafyDocumentId`, `assinafyStatus`, `assinafySigningUrl`, `assinafyAssignmentId`, `assinafySignerId`, `assinafySentAt`
- **Idempotência**: Guarda `assinafyDocumentId === null` antes de envio; webhook faz early return se status inalterado
- **Notificação**: Cria notificação `oficio.status_changed` para todos admins ativos dentro da mesma transação do webhook

#### Documento

Arquivo institucional armazenado ou arquivado para consulta futura (modelos de contratos, contratos, minutas, estatutos, atas, recibos, comprovantes, digitalizações, arquivos assinados, PDFs finais de Ofícios, etc.) e gerenciado pela equipe administrativa da Secretaria. Diferencia-se do _Ofício_ porque não controla a geração, numeração ou ciclo de vida formal do Ofício; apenas guarda o arquivo resultante quando houver arquivamento.

- **Categorias** (`document_category`): `modelo_contrato`, `contrato`, `minuta`, `estatuto`, `ata`, `oficio`, `rh`, `evento`, `nota_fiscal`, `comprovante`, `outro`.
- **Campos**: Nome, descrição, categoria, caminho no storage, tamanho, tipo MIME, usuário que realizou o upload.

#### Documento Vinculado

Documento associado a uma entidade específica da intranet, como Associado, Ofício, Consulta Jurídica, Processo Jurídico, Mensalidade ou outro registro de negócio.

#### Documento de Acervo

Documento geral da Secretaria sem vínculo com uma entidade única da intranet, como estatutos, atas, modelos, comunicados internos e arquivos administrativos de referência.

#### Signatário

A autoridade que assina e expede o documento.

- **Campos**: Nome (em maiúsculas) e Cargo (apenas iniciais maiúsculas).
- **Limpeza para Assinafy**: `cleanSignatoryName()` remove cargo/função após separadores " — ", " - ", "–" (ex: "João Silva — Presidente" → "João Silva"). Fallback: nome completo se regex não encontrar separador.

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

#### Oficial de Chancelaria

Servidor da carreira de Oficial de Chancelaria do Ministério das Relações Exteriores. A base cadastral da intranet representa a totalidade conhecida desses oficiais, não apenas membros da ASOF.

Um Oficial de Chancelaria pode ou não ser associado à ASOF. Também pode estar em atividade, aposentado, cedido ou em licença; essa situação funcional é independente do vínculo associativo.

_Avoid_: usar "Associado" para se referir à totalidade da carreira. O termo canônico para o universo completo é Oficial de Chancelaria.

#### Cadastro de Oficiais

Módulo cadastral que reúne a totalidade conhecida dos Oficiais de Chancelaria, incluindo associados e não associados à ASOF, ativos e aposentados.

A superfície principal do módulo deve priorizar localizar Oficiais de Chancelaria por nome ou parte do nome. Recortes como associados à ASOF, não associados, ativos funcionais, aposentados ou inadimplentes pertencem a filtros, relatórios ou buscas avançadas explícitas, não ao primeiro nível da experiência.

_Avoid_: nomear o módulo principal como "Associados" quando a tela ou relatório inclui oficiais sem vínculo associativo vigente.

#### Associado

Oficial de Chancelaria que possui vínculo associativo com a ASOF. No cadastro legado, corresponde ao campo `Associado = sim`.

_Avoid_: chamar oficiais não associados de "inativos". No domínio da ASOF, inativo é sinônimo operacional de aposentado/inatividade funcional, não ausência de vínculo associativo.

#### Lotação

Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE"). Campo: `assignment`.

#### Posto

Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília.

#### Padrão / Classe

Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões. Campo: `classPattern`.

#### Vínculo ASOF

Vínculo atual do Oficial de Chancelaria com a ASOF, derivado do campo legado `Associado = sim/não`.

Representa o vínculo com a ASOF, não a situação funcional do servidor. Os valores canônicos de produto são **Associado** e **Não associado**.

Na interface e relatórios, o rótulo canônico é **Vínculo ASOF**, com valores **Associado** e **Não associado**.

_Avoid_: exibir "Associativo: ativo/inativo" ou usar `inativo` para não associados, pois isso se confunde com aposentadoria/inatividade funcional.

#### Associado Anonimizado

Estado irreversível onde um associado inativo que atendeu aos requisitos de desfiliação tem seus Dados Pessoais e de Contato (Nome, CPF, SIAPE, E-mail, Endereço, etc.) permanentemente sobrescritos com máscaras irreversíveis, preservando apenas seu ID interno (`id`) para manter a integridade referencial do histórico contábil (mensalidades) e gerencial.

#### Situação Funcional

Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca`. Campo: `functionalStatus`.

Aposentados permanecem na base cadastral como Oficiais de Chancelaria e devem aparecer nas listagens, filtros e relatórios conforme sua situação funcional.

No uso operacional da ASOF, "inativo" deve ser interpretado como aposentado/inativo funcional, nunca como não associado.

#### Contribuição

Status derivado de pagamento da anuidade ASOF: `em_dia`, `inadimplente`. Campo: `contributionStatus`.

_Avoid_: `pendente_migracao` como status de contribuição. No domínio da ASOF, o associado está em dia ou inadimplente; pendência de importação/migração é estado operacional de dados, não situação contributiva.

#### SIAPE

Número de matrícula do servidor federal. Campo: `siape`. Buscável via blind index (`siape_hash`): busca exata por hash, não suporta busca parcial.

#### RG (Registro Geral)

Documento de identificação do associado. Campos: `rg` (número), `rg_issuer` (órgão expedidor), `rg_state` (UF), `rg_expedition_date` (data de expedição). Armazenado com PII encryption (`rg_ciphertext` + `rg_hash` para busca exata).

#### Sexo

Classificação de gênero do associado. Enum: `M`, `F`. Campo: `sex`.

#### Estado Civil

Situação civil do associado. Enum: `solteiro`, `casado`, `divorciado`, `viuvo`, `separado`, `outros`. Campo: `maritalStatus`. (`outros` é valor legado de migração para registros históricos sem correspondência exata.)

#### Naturalidade

Cidade e UF de nascimento do associado. Campos: `birthCity`, `birthState`.

#### Tipo de Missão

Classificação do tipo de missão do associado. Enum: `permanente`, `transitoria`. Campo: `missionType`.

#### Origem de Carreira

Origem da carreira do associado. Enum: `brasil`, `exterior`, `outros_orgaos`. Campo: `careerOrigin`.

#### Forma de Pagamento

Método de pagamento da mensalidade. Enum: `folha`, `boleto`, `pix`, `transferencia`, `outros`. Campo: `paymentMethod` (compartilhado com o módulo financeiro).

#### Dependente

Pessoa vinculada a um associado. Tabela: `dependents`. Campos: `name`, `relationship` (parentesco). CRUD inline no perfil do associado. Acesso: `admin`, `diretoria`, `secretaria`.

#### Convênio de Saúde

Plano de saúde vinculado a um associado. Tabela: `health_agreements`. Campos: `provider` (operadora), `startDate`, `endDate` (opcionais). CRUD inline no perfil do associado. Acesso: `admin`, `diretoria`, `secretaria`.

---

### Financeiro

#### Mensalidade

Registro mensal de pagamento de associado. Campo: `monthly_payments`.

#### Método de Pagamento

Forma de quitação da mensalidade: `folha`, `boleto`, `pix`, `transferencia`, `outros`. Campo: `paymentMethod`.

#### Status de Pagamento

Situação da mensalidade: `pago`, `pendente`, `atrasado`, `isento`, `cancelado`. Campo: `paymentStatus`.

Nota: não confundir com `contributionStatus` (campo `contribution_status` na tabela `associates`), que representa o status derivado de contribuição do associado: `em_dia`, `inadimplente`.

#### Inicialização de Mês

Processo de criar registros de mensalidade para todos os associados ASOF de um determinado mês/ano. Disparado manualmente por admin/diretoria.

---

### Jurídico

#### Consulta Jurídica

Solicitação de atendimento jurídico feita por associado. Possui número interno sequencial, status, e histórico de notas.

_Avoid_: "Demanda" como sinônimo de Consulta Jurídica. O termo canônico é Consulta Jurídica.

#### Nota (Jurídico)

Unidade de interação em uma Consulta Jurídica ou Processo Jurídico. Cada nota atualiza o `last_interaction_at` da consulta. Notas originadas de e-mail processado automaticamente carregam campos opcionais `email_thread_id`, `email_from`, `email_to` — mas permanecem o mesmo conceito de Nota.

_Avoid_: "Interação" como entidade separada. Toda interação — manual ou oriunda de e-mail — é uma Nota.

#### Assessor Jurídico Externo

Advogado de escritório parceiro externo que conduz ou acompanha uma Consulta Jurídica em nome da ASOF. Modelado na tabela `lawyers` (separada de `admins`, que são usuários internos). Campos: nome, e-mail, telefone, especialidades, escritório.

_Avoid_: "Advogado" sozinho, pois é ambíguo — pode ser o responsável interno (membro da Diretoria) ou o assessor externo. O termo canônico é Assessor Jurídico Externo.

#### Processo Jurídico


Caso jurídico mais estruturado (Fase 2 do módulo). Relaciona-se a pareceres e notas.

- **Status** (`legalProcessStatus`): `ativo`, `concluido`, `suspenso`.
- **Tipo** (`legalProcessType`): `judicial`, `administrativo`.
- **Subtipo** (`legalProcessSubtype`): `justica_federal`, `stf`, `mre`, `cgu`, `tcu`.

#### Status de Consulta Jurídica

Ciclo de vida da consulta: `aberta`, `aguardando_escritorio`, `respondida`, `arquivada`. Campo: `legal_consultation_status`.

#### Parecer

Opinião jurídica formal emitida pela assessoria jurídica da ASOF. Pode ser vinculada a um processo.

#### Prazo Processual

Compromisso com data-limite extraído de uma Consulta Jurídica, geralmente identificado a partir de e-mails do escritório ou documentos do processo. Modelado na tabela `legal_deadlines`.

- **Responsável** (`responsible_party`): `escritorio`, `associado`, `asof`.
- **Status**: `pendente`, `cumprido`, `atrasado`.
- Notificações progressivas antes do vencimento são geradas pelo sistema automaticamente.

_Avoid_: confundir com SLA de inatividade. O SLA mede ausência de atualização em uma Consulta Jurídica; o Prazo Processual mede um compromisso processual específico com data e responsável definidos.


---

### Atividades Administrativas

#### Atividade (Kanban)

Tarefa administrativa no board Kanban. Possui status (`a_fazer`, `em_andamento`, `aguardando_terceiros`, `concluido`), prioridade, responsável e associado relacionado.

#### Quick Add

Criação rápida de atividade diretamente no board, sem abrir formulário completo.

---

### Notificações e Eventos

#### Notificação

Alerta persistido para o usuário sobre reatribuição de atividades ou atualização de consulta jurídica. A entrega em tempo real é uma capacidade opcional, não parte essencial do conceito. Tipos (`notificationType`): `activity.completed`, `legal_consultation.answered`, `activity.assigned`, `legal_consultation.sla_warning`, `oficio.status_changed`, `email_triage_pending`, `lgpd_request`.

_Avoid_: tratar "notificação" como sinônimo de "evento em tempo real".

#### Alerta de Acompanhamento

Notificação que exige **resolução explícita** por um coordenador, com registro de quem resolveu, quando e qual ação foi tomada. Gerado automaticamente por inatividade prolongada (ex: ≥ 60 dias sem Nota) ou por Prazo Processual vencendo/vencido.

- **Tipos** (`follow_up_alert_type`): `inatividade`, `prazo_processual`, `escalacao`.
- **Ciclo de vida**: `ativo` → `resolvido` (com `resolved_by`, `resolved_at`, `resolution_note`).

_Avoid_: confundir com Notificação, cujo ciclo de vida encerra com a leitura. O Alerta de Acompanhamento só encerra quando o coordenador registra explicitamente a ação tomada.


#### Evento de Domínio

Registro imutável de algo que aconteceu no sistema (`associate.updated`, `legal_consultation.created`, etc.). Persistido em `domain_events` e disponível para dispatch outbound via webhooks.

#### Webhook Outbound

Envio HTTP assíncrono de eventos de domínio para sistemas externos. Assinado com HMAC SHA-256.

---

## Regras de Negócio

### Módulo de Ofícios

1. **Numeração Sequencial**: O número do ofício é sequencial e reinicia a cada ano civil (ex: 001/2026, 002/2026). Formato: `Ofício nº 001/2026-ASOF`.
2. **Imutabilidade de Identificação**: Uma vez gerado o número de um ofício, ele deve ser preservado. Se o ofício for cancelado, o número não deve ser reutilizado para evitar lacunas ou duplicidades na cronologia oficial.
3. **Roles de Acesso**: Operado por `admin`, `diretoria` e `secretaria`.
4. **Assinatura Digital (Assinafy)**: Ofícios com status `gerado` ou `rascunho` podem ser enviados para assinatura digital. O PDF é gerado on-the-fly com fontes Carlito (conforme ABNT/MRPR), embutimento completo (`subset: false`). Signatário único por envio; email não persistido no banco. Webhook Assinafy processa callbacks transacionalmente: atualiza ofício, loga auditoria, emite domain event, notifica admins.
5. **Conformidade ABNT/MRPR**: Margens 3cm (sup/esq), 2cm (inf/dir), espaçamento 1.5x (18pt), recuo primeira linha 1.25cm, fecho hierárquico, data por extenso opcional, validação de impessoalidade client-side (warnings).

### Módulo de Documentos

1. **Upload e Armazenamento**: Arquivos físicos devem ficar em armazenamento de objetos privado, com download por URL assinada de curta duração. O provedor de storage não faz parte do conceito de Documento.
2. **Restrições de Arquivos**: O tamanho do arquivo está limitado a 15 MB. São permitidos apenas arquivos de texto/documentos de escritório comuns (PDF, DOC, DOCX, XLS, XLSX, ODT, TXT).
3. **Controle de Acesso (Roles)**:
   - **Acesso total (listagem, download, upload, exclusão)**: Permitido apenas para `admin` e `secretaria`. O perfil `diretoria` não tem acesso ao módulo de documentos.
   - A intranet é a fonte canônica de autorização para Documentos relacionados ao domínio ASOF; sistemas externos de arquivamento não devem conceder acesso que a intranet negaria.
   - Expurgo físico de Documento é permitido apenas para `admin`, com motivo obrigatório, confirmação explícita e registro de auditoria. `secretaria` pode arquivar/desativar, mas não expurgar fisicamente.
4. **Experiência de Uso**: Usuários acessam Documentos pelo contexto de negócio na intranet (Secretaria, Associado, Ofício, Jurídico ou Financeiro). Sistemas externos de arquivamento podem armazenar, indexar e buscar arquivos, mas não são a interface operacional principal da ASOF.
5. **Busca de Documentos**: A busca inicial de Documentos é contextual ao módulo ou entidade de negócio onde o usuário já tem acesso. Busca global de Documentos é uma capacidade distinta e posterior, pois exige regras próprias de escopo, auditoria e exposição de resultados.
6. **Ciclo de Vida**: O fluxo normal de remoção de um Documento é arquivamento, desativação ou ocultação das listas padrão, preservando histórico e auditoria. Expurgo físico é ação excepcional para LGPD ou erro grave, exige motivo explícito, role restrita e registro de auditoria.
7. **Entrada de Documentos**: O canal operacional inicial de criação de Documento é upload manual pela intranet. Ingestão por email/webhook pode existir como entrada técnica para triagem, mas não deve criar Documento válido sem classificação, vínculo quando aplicável, autorização e auditoria na intranet.

### Módulo Financeiro

1. **Mensalidades por Mês/Ano**: Cada associado ASOF deve ter um registro de mensalidade para cada mês/ano. O registro é criado via inicialização de mês.
2. **Status Derivado**: O status de contribuição do associado (`contributionStatus`) é derivado a partir do histórico de mensalidades pagas/inadimplentes.
3. **Inicialização Idempotente**: Inicializar um mês já existente não deve criar duplicatas.
4. **Roles de Acesso**: `admin` e `diretoria` têm acesso completo; `secretaria` é redirecionada para o dashboard.

### Módulo Jurídico

1. **Número Interno Sequencial**: Consultas jurídicas recebem um número interno sequencial gerado atomicamente dentro de uma transação.
2. **Status Flow**: Uma consulta pode transitar entre status definidos pelo enum `legal_consultation_status` (`aberta`, `aguardando_escritorio`, `respondida`, `arquivada`).
3. **Notas Vinculadas**: Cada interação (nota) deve atualizar o timestamp `last_interaction_at` da consulta/processos.
4. **Roles de Acesso**: `admin` e `diretoria` têm acesso; `secretaria` é bloqueada no layout do módulo.
5. **Ingestão de E-mail**: E-mails processados automaticamente podem registrar controle operacional de prazos e demandas, sem decisão de mérito jurídico.
   - **Exatamente uma Consulta aberta correlacionada ao associado remetente** → Nota operacional adicionada automaticamente, sem alterar status final, resposta, satisfação, responsável ou conclusão.
   - **E-mail sem Consulta correlacionada, com múltiplas Consultas abertas ou com Consulta arquivada/respondida** → Permanece como triagem operacional pendente; coordenador vincula, abre nova Consulta, descarta ou decide o próximo passo.
   - Notas automáticas devem se identificar como triagem operacional de e-mail e não como orientação jurídica, parecer, resposta oficial ou decisão de mérito.

### Módulo de Associados

1. **Acesso Operacional a PII**: Todos os usuários da intranet são funcionários, secretaria ou diretoria da ASOF e precisam de acesso integral aos dados cadastrais dos associados para executar rotinas administrativas, financeiras, jurídicas e de atendimento. A política do produto é visibilidade completa para usuários autenticados e autorizados, sem máscara por role dentro da intranet.
2. **Armazenamento de PII**: A visibilidade integral no app não autoriza exposição fora da intranet. Plaintext em campos legados/importados é uma exceção temporária do go-live, limitada ao banco Neon da intranet e sob responsabilidade da ASOF + manutenção técnica até a fase de hardening pós-go-live (alvo: 90 dias após produção). Durante a exceção, manter controle de acesso ao Neon, backups protegidos, auditoria, menor privilégio e `sanitizePii()` em logs; a remediação é recriptografar campos com `encryptPii()`, recriar índices de busca com `piiBlindIndex()`, remover dumps plaintext e manter novas rotas de escrita no padrão criptografado quando suportado.
3. **Importação em Lote**: Associados podem ser importados via CSV com upsert por CPF/SIAPE.
4. **Busca por CPF/SIAPE**: A busca por CPF e SIAPE usa blind indexes (`cpf_hash`, `siape_hash`, `rg_hash`) para lookup exato. Não suporta busca parcial. CPF deve ser normalizado (apenas dígitos) antes do hash. SIAPE deve ser normalizado (apenas dígitos) antes do hash. A busca por nome continua via `ILIKE` com escape.
5. **Dependentes e Convênios**: Gerenciados inline no perfil do associado. Dependentes possuem nome e parentesco. Convênios de saúde possuem operadora, data de início e data de fim (opcionais). Ambos suportam adição, edição e exclusão por `admin`, `diretoria` e `secretaria`.
6. **Exportação CSV Expandida**: 37 campos disponíveis em 3 grupos (Dados Pessoais, Endereço, Administrativo). Filtros por tipo de missão, origem de carreira e forma de pagamento. Dados PII sensíveis são descriptografados das colunas ciphertext para exportação, nunca lidos como plaintext.
7. **Preservação de Filtros**: Navegação entre listagem e detalhe/editar preserva filtros e paginação via parâmetro `returnTo` na query string.

### Autenticação e Autorização

1. **Sessão Administrativa**: Sessão server-side própria, baseada em cookie `httpOnly` assinado e usuário administrativo persistido em `admins`.
2. **Revalidação Local**: Cada sessão é revalidada contra `admins` para verificar `isActive`, `role` e `mustChangePassword`.
3. **Rate Limit de Login**: 5 tentativas por email a cada 15 minutos, persistido em PostgreSQL.
4. **Dev Bypass**: `SKIP_AUTH=true` permite desenvolvimento sem autenticação real, mas é ignorado em produção.
5. **Redefinição de Senha**: Administradores podem resetar a senha de outros usuários. A exposição temporária de credenciais geradas no painel administrativo é tratada como um débito técnico documentado no ADR 005. Como política de segurança de dados, senhas temporárias nunca devem ser salvas em logs ou registros de auditoria.

### Auditoria e LGPD

1. **Data Access Logging**: Cada acesso a dados PII (view, export, edit) é registrado em `audit_logs` para compliance com Art. 30/37 da LGPD.
2. **Sanitização de PII**: Logs de erro e payloads de eventos passam por redação automática de dados sensíveis.
3. **PII View** (`publicAssociateListColumns` em `src/lib/associates/repository.ts`): Seleção de colunas Drizzle ORM que exclui campos `_ciphertext` e `_hash`, fornecendo uma visão segura para listagens paginadas de associados.
4. **Ator Sistema**: `logAuditAction` aceita `adminId: null` para operações automáticas (ex: webhook Assinafy, marcação automática de inadimplência, dispatch agendado). Dois bypass sites migrados: `finance/service.ts` (`auto_mark_overdue`) e `dispatch/route.ts` (`domain_event_dispatch_scheduled`).
5. **Transação de Auditoria**: `logAuditAction` suporta parâmetro `executor` (Tx) para inclusão dentro de transações existentes (ex: webhook handler).

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

### Webhook Inbound Assinafy

- Endpoint: `POST /api/webhooks/assinafy` (público, validação por header de segredo compartilhado X-Webhook-Secret)
- Eventos processados: `document_signed`, `signer_signed_document`, `document_rejected`, `document_expired`, `document_cancelled`, `document_failed`, `document_ready`, `signer_declined`, `signer_viewed`, `assignment_created`, `assignment_completed`
- Processamento transacional: atualiza `oficios`, loga `audit_logs`, emite `domain_events.official_letter.status_changed`, cria `notifications.oficio.status_changed` para todos admins ativos
- Idempotência: early return se `oficio.assinafyStatus` já igual ao mapeado
- Signatários existentes na Assinafy: fallback silencioso via `GET /signers` se POST retornar 400

---

## Eventos de Domínio Suportados

- `legal_consultation.created`
- `legal_consultation.status_changed`
- `associate.updated`
- `monthly_payment.updated`
- `official_letter.created`
- `official_letter.published`
- `official_letter.status_changed` — status alterado via webhook Assinafy

---

## Módulos de Suporte

Além dos módulos de domínio listados acima, o sistema inclui módulos auxiliares em `src/lib/`:

- **`email/`** — Envio de e-mail via Mailjet (index.ts, templates.ts).
- **`search/`** — Busca global de associados e atividades (queries.ts). Busca por CPF/SIAPE usa blind indexes para lookup exato; busca por nome usa ILIKE.
- **`reports/`** — Exportação CSV de associados com seleção de campos LGPD, filtros avançados, formatação pt-BR e descriptografia PII.
- **`storage/`** — Interface de armazenamento de documentos; o provedor de objetos privado é decisão de infraestrutura.
- **`assinafy/`** — Cliente Assinafy, webhook handler, repository e service para assinatura digital de ofícios.
- **`errors/`** — Hierarquia de erros tipados (`DomainError`, `ConcurrencyConflictError`, `NotFoundError`, `ValidationError`, `RateLimitError`, `ExternalServiceError`, `UnauthorizedError`) com handlers globais `unhandledRejection`/`uncaughtException`.

---

## Contato e Responsabilidades

- **Diretoria Executiva**: Tomada de decisão estratégica, acesso a relatórios e jurídico.
- **Secretaria**: Operação diária (ofícios, atividades, cadastro de associados).
- **Administração TI**: Configuração de usuários, integrações, auditoria e infraestrutura.
