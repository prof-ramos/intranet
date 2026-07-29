# Jornada do Usuário: Controle de Mensalidades

Este documento descreve a jornada do administrador ao interagir com o módulo financeiro baseado no schema de `monthly_payments`.

Este é o contrato técnico canônico da jornada: somente `admin` e `diretoria`
acessam o módulo, e toda mutação financeira deve preservar o registro de
auditoria sem incluir CPF, SIAPE completo ou dados bancários.

## Atores

- **Administrador Financeiro**: Membro da equipe administrativa ou diretoria com permissões para gerenciar pagamentos.

---

## Fluxo 1: Inicialização do Mês

_O objetivo é criar os registros base para todos os associados ASOF no início de um novo mês._

1. **Acesso**: O administrador navega até **Financeiro > Controle de Mensalidades**.
2. **Seleção**: Escolhe o mês e ano desejados através dos controles de navegação.
3. **Trigger**: Se o mês ainda não possui registros, um botão **"Inicializar Mês [Mês/Ano]"** é exibido.
4. **Processamento**:
   - O sistema identifica todos os associados com `associationStatus = 'associado'`.
   - Cria um registro em `monthly_payments` para cada um.
   - **Automação**: Associados cujo `paymentMethod` padrão é `'folha'` são marcados automaticamente como `status = 'pago'`.
   - Demais associados são criados com `status = 'pendente'`.
   - A inicialização deve ser idempotente e baseada na restrição única (`associate_id`, `year`, `month`), retornando quantos registros foram criados, mantidos e rejeitados.
   - A ação em lote deve registrar auditoria com mês/ano, total processado e usuário executor, sem registrar CPF, SIAPE completo ou dados bancários.

---

## Fluxo 2: Gestão e Filtros

_O objetivo é localizar rapidamente associados para conferência de pagamentos._

1. **Busca**: O administrador utiliza a barra de busca para filtrar por **Nome** (busca textual com debounce sincronizada na URL).
2. **Filtros Avançados** (sincronizados com URL — `search-params.ts`):
   - Filtra por **Status** (`pago`, `pendente`, `atrasado`, `isento`).
   - Filtra por **Forma de Pagamento** (`folha`, `boleto`, `pix`, `transferencia`, `outros`).
   - Filtra por **Localização** (`brasil`, `exterior`).
3. **Visualização**: A tabela exibe o status atual, a forma de pagamento efetiva e o nome do associado. Pills de filtro refletem o estado ativo da URL.
4. **Server-side**: Filtros são aplicados no PostgreSQL via Drizzle ORM (`ILIKE` nome, `eq` status/método/localização). Cache separado por combinação de filtros (`unstable_cache`).
5. **Privacidade**: SIAPE/CPF não são exibidos na listagem.

---

## Fluxo 3: Atualização Manual

_O objetivo é registrar pagamentos recebidos fora do fluxo automático de folha._

1. **Seleção**: O administrador localiza o associado (ex: que enviou um comprovante de PIX).
2. **Ação**: No seletor de status da linha correspondente, altera de **"Pendente"** para **"Marcar Pago"**.
3. **Feedback**:
   - Indicador de carregamento enquanto a _Server Action_ processa.
   - Banner verde de sucesso: "Pagamento atualizado com sucesso." (auto-limpa em 3s).
   - Em caso de conflito de concorrência: banner vermelho "Este registro foi alterado por outro usuário. Recarregue a página."
4. **Concorrência**: A Server Action valida `expectedUpdatedAt`. Se outro usuário alterou o registro no intervalo, a operação é rejeitada sem sobrescrever dados.

---

## Fluxo 4: Auditoria e Conformidade (LGPD)

_O objetivo é garantir que todas as alterações financeiras sejam rastreáveis._

1. **Registro**: Cada alteração de status gera uma entrada na tabela `audit_logs`.
2. **Conteúdo completo**: O log captura `changes.old` e `changes.new`:
   - `old`: `{ status, paymentMethod, paidAt }` do registro anterior (ou `null` em insert).
   - `new`: `{ status, paymentMethod, paidAt }` após a alteração.
   - `metadata`: `{ associateId, year, month }`.
3. **Sanitização**: Campos sensíveis (CPF, SIAPE, email, endereço) são removidos automaticamente pelo `logAuditAction`.
4. **Transparência**: Administradores podem consultar o módulo **Auditoria** (`/app/config/auditoria`) para verificar quem e quando alterou o registro financeiro.

---

## Regras de Negócio Implementadas

- **Imutabilidade de Identidade**: `uniqueIndex` em `(associateId, year, month)`.
- **Segurança de Role**: Apenas `admin` e `diretoria` acessam o módulo (`requireRole`).
- **Fallback de método**: Exibe `monthPaymentMethod` se existir, senão `defaultPaymentMethod` do associado.
- **Bulk-init seguro**: `initializeMonth` cria registros apenas para associados ASOF sem registro no mês. Não sobrescreve pagamentos já alterados.
- **Concorrência**: `updateMonthlyPayment` compara `expectedUpdatedAt` dentro de `db.transaction()`. Se divergir, rejeita com `CONCURRENCY_CONFLICT`.
- **Audit log completo**: Captura old state (`status`, `paymentMethod`, `paidAt`) antes do update.
- **Sem PII em logs**: `logAuditAction` sanitiza CPF, SIAPE, email, endereço automaticamente.
- **Filtros server-side**: `ILIKE` com escape de wildcards (`%`, `_`) para prevenir SQL injection.
