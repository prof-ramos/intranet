# JORNADA DO USUÁRIO - FINANCEIRO

Este documento descreve o usuário e sua jornada no uso da plataforma. Bruna Lima, Analista de Planejamento Financeiro da ASOF, é responsável por toda a parte financeira da entidade.

## Fluxos

Ao acessar a intranet, Bruna verifica mensalmente quais associados estão em dia e quais estão inadimplentes. A ASOF aceita as seguintes formas de pagamento:
1) Desconto em folha - SIGEPE - para servidores ativos e inativos no Brasil
2) Boleto - para servidores ativos e inativos no Brasil (incluindo inativos no exterior)
3) PIX - para servidores ativos e inativos no Brasil (incluindo inativos no exterior)
4) Servidores no Exterior: desconto em folha realizado via DPAG - Divisão de Pagamentos do MRE

Mensalmente, Bruna emite um relatório de pagamentos pelo SIGEPE, acessando-o no site da entidade. Além disso, a DPAG envia a folha de pagamentos dos servidores no exterior. Os pagamentos via boleto e PIX são gerados pelo sistema financeiro da ASOF, e Bruna controla os recebimentos.

## Funcionalidades

Bruna precisa gerenciar os associados e seus pagamentos.

### Associados

Ela deve cadastrar novos associados e editar informações de associados já cadastrados.

### Pagamentos

Ela precisa cadastrar novos pagamentos e editar informações de pagamentos já registrados.

## Regras de Segurança e Privacidade

- O módulo financeiro manipula dados pessoais e financeiros protegidos pela LGPD; telas, logs e mensagens de erro não devem expor CPF, SIAPE completo, endereço ou detalhes de pagamento além do necessário para a operação.
- Apenas perfis autorizados (`admin` e `diretoria`, salvo decisão formal em contrário) podem consultar ou alterar mensalidades.
- Toda alteração manual de status, forma de pagamento, data de pagamento ou inicialização mensal deve gerar registro em `audit_logs` com usuário, entidade afetada, valores anteriores e novos, data/hora e origem da ação.
- Listagens financeiras devem usar paginação e filtros server-side; não carregar todos os associados/pagamentos no cliente.
- A inicialização mensal em lote deve ser idempotente: não pode duplicar mensalidades para o mesmo `associate_id`, `year` e `month`, e deve apresentar resumo de criados, ignorados e falhas.
- Exportações e relatórios financeiros devem registrar auditoria, limitar campos sensíveis e evitar valores suficientes para reidentificação quando o uso for apenas gerencial.
