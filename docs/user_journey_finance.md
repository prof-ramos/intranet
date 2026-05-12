# Jornada do Usuário: Controle de Mensalidades

Este documento descreve a jornada do administrador ao interagir com o módulo financeiro baseado no schema de `monthly_payments`.

## Atores
- **Administrador Financeiro**: Membro da equipe administrativa ou diretoria com permissões para gerenciar pagamentos.

---

## Fluxo 1: Inicialização do Mês
*O objetivo é criar os registros base para todos os associados ativos no início de um novo mês.*

1. **Acesso**: O administrador navega até **Financeiro > Controle de Mensalidades**.
2. **Seleção**: Escolhe o mês e ano desejados através dos controles de navegação.
3. **Trigger**: Se o mês ainda não possui registros, um botão **"Inicializar Mês [Mês/Ano]"** é exibido.
4. **Processamento**:
   - O sistema identifica todos os associados com `associationStatus = 'ativo'`.
   - Cria um registro em `monthly_payments` para cada um.
   - **Automação**: Associados cujo `paymentMethod` padrão é `'folha'` são marcados automaticamente como `status = 'pago'`.
   - Demais associados são criados com `status = 'pendente'`.
   - A inicialização deve ser idempotente e baseada na restrição única (`associate_id`, `year`, `month`), retornando quantos registros foram criados, mantidos e rejeitados.
   - A ação em lote deve registrar auditoria com mês/ano, total processado e usuário executor, sem registrar CPF, SIAPE completo ou dados bancários.

---

## Fluxo 2: Gestão e Filtros
*O objetivo é localizar rapidamente associados para conferência de pagamentos.*

1. **Busca**: O administrador utiliza a barra de busca para filtrar por **Nome** ou **SIAPE**.
2. **Filtros Avançados**:
   - Filtra por **Status** (ex: ver apenas "Atrasados").
   - Filtra por **Forma de Pagamento** (ex: ver apenas quem paga via "PIX").
3. **Visualização**: A tabela exibe o status atual, a forma de pagamento e o nome do associado de forma clara e premium.
4. **Paginação**: A listagem deve usar paginação e filtros no servidor para evitar carregar todo o cadastro financeiro no browser.
5. **Privacidade**: SIAPE/CPF, quando necessários, devem ser mascarados na listagem e exibidos integralmente apenas em contexto administrativo justificado.

---

## Fluxo 3: Atualização Manual
*O objetivo é registrar pagamentos recebidos fora do fluxo automático de folha.*

1. **Seleção**: O administrador localiza o associado (ex: que enviou um comprovante de PIX).
2. **Ação**: No seletor de status da linha correspondente, altera de **"Pendente"** para **"Marcar Pago"**.
3. **Feedback**:
   - O sistema exibe um indicador de carregamento enquanto a *Server Action* processa.
   - O ícone muda para um check verde (`CheckCircle`).
   - A coluna de auditoria (interna) registra o `updatedBy` e a data `paidAt`.

---

## Fluxo 4: Auditoria e Conformidade (LGPD)
*O objetivo é garantir que todas as alterações financeiras sejam rastreáveis.*

1. **Registro**: Cada clique em "Marcar Pago" ou alteração de status gera uma entrada na tabela `audit_logs`.
2. **Conteúdo**: O log armazena:
   - Quem realizou a alteração (`performedBy`).
   - O associado afetado (`entityId`).
   - Os valores antigo e novo do status.
   - O mês/ano e a origem da alteração, sem incluir CPF, endereço ou comprovantes em texto livre.
3. **Transparência**: Em caso de erro, o administrador pode consultar o módulo de **Auditoria** para verificar quem e quando alterou o registro financeiro.

---

## Regras de Negócio Implementadas (Baseadas no Schema)
- **Imutabilidade de Identidade**: O vínculo `associate_id`, `year` e `month` é único (protegido por `uniqueIndex`).
- **Segurança de Role**: Apenas usuários com role `admin` ou `diretoria` podem ver e editar mensalidades.
- **Fallbacks**: O sistema sempre prefere o `paymentMethod` registrado no mês, mas exibe o `defaultPaymentMethod` do associado se o registro mensal ainda não foi customizado.
- **Bulk-init seguro**: Inicializações mensais nunca sobrescrevem pagamentos já alterados manualmente sem uma ação explícita e auditada.
- **Sem PII em logs**: Logs operacionais e erros de Server Actions devem referenciar IDs internos e contagens, não documentos pessoais.
