# Páginas da Intranet ASOF

Documentação das funcionalidades de cada rota da aplicação.

## Rotas Públicas

### `/` (Root)

Redireciona automaticamente para `/login` se o usuário não estiver autenticado, ou para `/app` se estiver.

### `/login`

Página de autenticação. Aceita email e senha, valida via Server Action `login` e cria sessão via cookie assinado. Exibe mensagem de erro para credenciais inválidas. Protegida contra enumeração de usuários via timing attack (bcrypt dummy hash).

### `/change-password`

Fluxo obrigatório de troca de senha para usuários com `mustChangePassword=true`. Requer autenticação. Valida senha atual, nova senha (mínimo 8 caracteres) e confirmação.

## Área Autenticada (`/app/*`)

### `/app` (Dashboard)

Página inicial após login. Exibe métricas do quadro associativo e atividades administrativas:

- Stripe com total de associados ativos, pendentes de migração, atividades em aberto, atrasadas e taxa de contribuições
- Colunas de status das atividades (kanban resumido)
- Top regiões de lotação
- Atividades urgentes (vencidas)

### `/app/associados`

Lista paginada de associados ativos. Funcionalidades:

- Busca por nome (LIKE com escape de caracteres especiais)
- Paginação (20 itens por página)
- Link para perfil do associado
- Link para editar (visível apenas para admin/diretoria)
- Botão para exportar relatório CSV

### `/app/associados/[id]`

Perfil completo do associado com:

- Dados de identificação (nome, CPF, SIAPE, contato)
- Endereço e localização
- Dados administrativos (lotação, classe, situação funcional/contribuição)
- Linha do tempo (adesão, lotação, última atualização)
- Observações internas (apenas admin)
- Atividades vinculadas
- Mascaramento LGPD para perfil `secretaria`

### `/app/associados/[id]/editar`

Formulário de edição completo dos dados do associado. Permite alterar:

- Identificação, endereço, dados administrativos
- Situação funcional, associativa e contribuição
- Observações internas (apenas admin)
- Validação de CPF, SIAPE, datas e emails
- Apenas admin e diretoria têm acesso

### `/app/associados/relatorio`

Interface para gerar relatório CSV de associados:

- Seleção de campos a exportar (com classificação LGPD)
- Filtros por situação funcional, associativa, contribuição e mês de aniversário
- Download do arquivo CSV com BOM UTF-8
- Auditoria automática do download (LGPD)
- Rate limit de 10 downloads/minuto por IP

### `/app/atividades`

Quadro kanban de atividades administrativas com:

- Cards organizados por status
- Drag-and-drop entre colunas
- Filtros por responsável e associado
- Resumo de contagem por prioridade
- Quick add de novas atividades

### `/app/atividades/nova`

Formulário para criar nova atividade com:

- Título, descrição, status, prioridade
- Vinculação a responsável (admin) e associado
- Data de vencimento e tags

### `/app/financeiro/mensalidades`

Dashboard financeiro de mensalidades com:

- Inicialização mensal de pagamentos (`initializeMonthAction`)
- Tabela de pagamentos com status (`em_dia`, `inadimplente`, `isento`)
- KPIs: total recebido, inadimplentes, isentos, taxa de adimplência
- Navegação mensal (mês anterior/próximo)
- Acesso restrito a admin/diretoria

### `/app/juridico`

Dashboard do módulo jurídico com:

- Indicadores: consultas abertas, aguardando escritório, sem atualização >7 dias, SLA vencendo, respondidas no mês
- Lista de ações pendentes (SLA vencendo, sem atualização, aguardando escritório)
- Distribuição por status
- Acesso restrito a admin/diretoria

### `/app/juridico/consultas`

Lista paginada de consultas jurídicas com:

- Busca por título ou número interno
- Filtro por status
- Colunas: número, título, associado, status, SLA, última atualização
- Destaque visual para consultas stale (>7 dias) e SLA vencido

### `/app/juridico/consultas/nova`

Formulário para criar nova consulta jurídica:

- Título e resumo da pergunta
- Texto completo da questão
- Vinculação a associado
- Prazo SLA (dias)
- Geração automática de número interno sequencial (JUR-YYYY-NNN)

### `/app/juridico/consultas/[id]`

Detalhamento de uma consulta jurídica:

- Dados da consulta (status, título, resumo, texto completo)
- Informações do associado vinculado
- SLA e datas
- Histórico de notas/interações
- Formulário para adicionar nova nota
- Atualização de status
- Painel lateral com resumo

### `/app/config`

Hub de configurações do sistema. Hoje expõe integrações e webhooks e mantém uma área reservada para futuras preferências operacionais.

### `/app/config/auditoria`

Consulta paginada de eventos de auditoria. Acesso restrito a admin/diretoria.

- Filtro por ação, tipo de entidade e intervalo de datas
- Exibe ator, ação, entidade e data/hora em America/Sao_Paulo
- Paginação de 50 eventos por página

### `/app/config/usuarios`

Gerenciamento de usuários administrativos:

- Lista de todos os usuários (nome, email, perfil, status)
- Reset de senha (gera senha temporária, força troca)
- Ativação/desativação de conta
- Apenas admin tem acesso
- Auditoria de todas as ações

### `/app/config/lotacoes`

Gerenciamento de lotações (postos):

- Cadastro de nova lotação (nome, tipo: domestic/abroad)
- Edição de lotação existente
- Ativação/desativação
- Validação de duplicidade de nome
- Apenas admin/diretoria tem acesso
- Auditoria de todas as ações

### `/app/config/integracoes/api-keys`

Gerenciamento de chaves de API para integrações M2M:

- Criação de chave com escopos (events:read, events:write, webhooks:manage, admin)
- Exibição única do segredo HMAC na criação/rotação
- Cópia do comando curl de exemplo
- Desativação/reativação de chave
- Apenas admin tem acesso

### `/app/config/integracoes/ia`

Configurações de inteligência artificial (Gemini):

- Exibição do status da integração Gemini
- Indicador visual se a chave está configurada
- Apenas admin tem acesso

### `/app/config/integracoes/webhooks`

Gerenciamento de subscriptions de webhooks outbound:

- Lista de webhooks cadastrados com URL de destino e status
- Criação de subscription com targetUrl HTTPS pública
- Rotação de segredo do webhook
- Ativação/desativação de subscription
- Apenas admin tem acesso

### `/app/email-triage`

Lista de emails triados automaticamente com Gemini AI:

- KPIs: total de emails, por status, taxa de conclusão
- Tabela paginada com filtros por status, prioridade e pesquisa textual (blind indexes para campos PII como remetente/destinatário)
- Ações em massa: validar, concluir, arquivar
- Acesso restrito a admin/diretoria

### `/app/email-triage/[id]`

Detalhamento de uma triagem de email:

- Conteúdo completo do email (remetente, destinatário, assunto, corpo) com mascaramento LGPD para perfil secretaria
- Classificação da IA (categoria, prazo, risco, ação recomendada)
- Observações e notas internas
- Atualização de status e validação manual
- Apenas admin/diretoria tem acesso irrestrito; secretaria vê com campos mascarados
- Auditoria automática de acesso ao conteúdo sensível (LGPD)

### `/app/etiquetas`

Geração de etiquetas (Pimaco):

- Configuração do modelo de etiqueta (Pimaco)
- Seleção de layout e orientação
- Impressão via navegador

### `/app/privacidade`

Política de privacidade e termos de uso da intranet:

- Exibição da política LGPD
- Informações sobre tratamento de dados pessoais
- Canal de contato para exercício de direitos do titular

### `/app/secretaria/oficios`

Lista de ofícios cadastrados:

- Tabela paginada com número, destinatário, data, status
- Filtros por status e período
- Ações: visualizar, baixar PDF, editar, cancelar
- Acesso restrito a admin/diretoria/secretaria

### `/app/secretaria/oficios/novo`

Formulário de criação de ofício seguindo o Padrão Ofício:

- Identificação do documento (número sequencial automático)
- Destinatário, cargo, vocativo, assunto
- Editor rich text para corpo do ofício
- Fecho e identificação do signatário
- Geração de PDF sob demanda

### `/app/secretaria/oficios/[id]/editar`

Edição de ofício existente:

- Mesmo formulário da criação, com dados preenchidos
- Permite alterar destinatário, assunto, texto e signatário
- Apenas ofícios não cancelados podem ser editados

### `/app/secretaria/documentos`

Gerenciamento de documentos institucionais:

- Upload de arquivos com categorias (contrato, ata, oficio, rh, etc.)
- Lista paginada com busca por nome e filtro por categoria
- Download e exclusão de documentos
- Vinculação a entidades (associado, ofício, consulta)
- Acesso restrito a admin/diretoria/secretaria

### `/app/secretaria/emails/gerar`

Ferramenta de geração de emails em lote:

- Seleção de destinatários por filtro (ativo, inadimplente, etc.)
- Editor de assunto e corpo do email
- Envio em lote via Mailjet (rate limit: 10 requisições/minuto por IP, max 50 destinatários por lote)
- Histórico de envios com auditoria
- Ações registradas em audit_logs

## Route Handlers

### `/app/associados/relatorio/download` (GET)

Gera e faz download do relatório CSV de associados. Rate limitado por IP. Auditoria automática.
