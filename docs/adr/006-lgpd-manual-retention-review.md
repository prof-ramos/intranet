# ADR 006: Revisão Manual Obrigatória para Requisições e Expirações LGPD

## Contexto e Problema

A Lei Geral de Proteção de Dados (LGPD) exige que os titulares de dados tenham ferramentas para exercer o direito ao apagamento/anonimização (Direito ao Esquecimento). Paralelamente, o sistema precisa de rotinas para limpar dados inativos cuja retenção expirou (Issue #72 e #73).

No entanto, o **Artigo 14 do Estatuto Social da ASOF** estabelece que a desfiliação só ocorre *automaticamente* se o associado estiver quite com suas obrigações (não tiver dívidas) e não fizer parte de ação judicial ajuizada pela ASOF.

Se o sistema realizasse um apagamento (hard delete) ou anonimização de forma 100% automatizada — fosse pelo clique do usuário ou por um cron job —, correria o risco de apagar dados necessários para o exercício regular do direito em processos judiciais ou cobranças financeiras, violando o Estatuto da ASOF e contrariando a própria LGPD (Art. 16, I e IV), que prevê exceções ao apagamento para essas finalidades.

## Decisão

Optamos por **não automatizar a destruição de dados**. Em vez disso, introduzimos o padrão de **Triagem Proativa Humana**:

1. **Requisições Inbound (Issue #73)**: O clique no botão "Solicitar Exclusão" pelo associado atuará apenas como um gerador de intenção, criando uma **Atividade** (Kanban) para a Secretaria com a tag `LGPD`. O sistema nunca apagará o dado na hora. A Secretaria analisará o status financeiro e jurídico antes de efetivar ou recusar formalmente o pedido.
2. **Rotinas Outbound (Issue #72)**: O cron job de expiração não fará *update/delete* nas tabelas. Ele será um sinalizador ("watchdog") que varrerá o banco procurando associados inativos expirados e criará Atividades para a Secretaria: *"Atenção: Prazo de guarda expirado. Aprovar anonimização?"*.

## Consequências

- **Positivas**: Evitamos perda de contatos de réus ou autores em processos judiciais longos. Mantemos 100% de compliance com o Estatuto da ASOF. Não corrompemos histórico financeiro de devedores.
- **Negativas**:
  - A Secretaria terá mais carga operacional manual para concluir processos de exclusão e revisar os alertas do cron job.
  - **SLA de triagem**: Toda **Atividade de triagem** gerada (seja pelo clique do associado ou pelo cron job de expiração) deve ser concluída — com aprovação ou recusa fundamentada — em até **15 dias corridos** a partir da data de criação da **Activity**.
  - **Recusas motivadas**: Toda **Activity** que resulte em recusa de apagamento/anonimização deve registrar a fundamentação jurídica aplicável, citando explicitamente o dispositivo legal: **Art. 16, I** (guarda para cumprimento de obrigação legal) ou **Art. 16, IV** (exercício regular de direitos em processo judicial/administrativo/arbitral), e, quando aplicável, **Art. 18 §5º** (restrição ao direito de eliminação). O campo `description` da Activity deve conter esta citação antes do encerramento.
  - **Treinamento obrigatório**: A Secretaria deve passar por treinamento sobre os fundamentos legais de recusa antes de operar o módulo de triagem LGPD, garantindo rastreabilidade e conformidade nas respostas ao titular.

