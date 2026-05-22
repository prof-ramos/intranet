# Jornada da Usuária — Bruna

## Página de Controle Financeiro | Projeto `prof-ramos/intranet`

---

## Contexto

A usuária principal da página de controle financeiro é a **Bruna**, Analista Administrativa Financeira da entidade.
Atualmente, ela realiza o controle das contribuições mensais dos associados por meio de uma planilha. Nesta etapa do projeto, **não haverá automação de cobrança, conciliação bancária ou importação automática de relatórios**.

A proposta inicial é **substituir a planilha por uma ferramenta interna dentro do projeto `prof-ramos/intranet`**, mantendo o processo operacional atual, porém com melhor organização, rastreabilidade e usabilidade.

---

## Objetivo da Página

Permitir que a Bruna registre, consulte e acompanhe manualmente os pagamentos mensais dos associados, substituindo o controle feito em planilha.

A ferramenta deverá funcionar como uma versão estruturada da planilha atual, com campos, filtros, histórico e organização por associado, mês, competência e modalidade de pagamento.

---

## Perfil da Usuária

| Campo                 | Valor                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nome**              | Bruna                                                                                                                                                                                                                 |
| **Cargo**             | Analista Administrativa Financeira                                                                                                                                                                                    |
| **Responsabilidades** | Controlar contribuições mensais; Conferir pagamentos; Registrar manualmente; Consultar pendências; Verificar inadimplência; Conferir relatórios SIGEPE e Itamaraty; Registrar pagamentos PIX, boleto ou transferência |

---

## Escopo Atual da Ferramenta

### A ferramenta irá substituir

- Planilha de controle financeiro
- Marcação manual de pagamentos por mês
- Consulta manual linha por linha
- Controle visual simples de adimplência

### A ferramenta **não irá automatizar**, por enquanto

- Importação automática de relatórios SIGEPE
- Importação automática de relatórios do Itamaraty
- Conciliação bancária automática
- Geração automática de boleto
- Envio automático de cobrança
- Leitura automática de PIX, boleto ou transferência
- Baixa automática de pagamentos

---

## Jornada Atual da Bruna

### 1. Acessar a página de controle financeiro

**Objetivo:** Entrar na ferramenta interna para visualizar e atualizar o controle financeiro dos associados.

**Ações da Bruna:**

- Acessa a intranet
- Entra na página de controle financeiro
- Visualiza a lista de associados
- Filtra ou pesquisa o associado desejado

**Necessidade da interface:**

- Campo de busca por nome
- Filtros por situação financeira
- Filtros por forma de pagamento
- Visualização mensal dos pagamentos

---

### 2. Consultar a situação financeira de um associado

**Objetivo:** Verificar se determinado associado está adimplente ou possui pendências.

**Ações da Bruna:**

- Pesquisa o nome do associado
- Acessa o registro financeiro
- Consulta os meses pagos e pendentes
- Verifica a modalidade de pagamento do associado

**Informações exibidas:**

- Nome do associado
- Situação atual
- Forma de pagamento
- Lotação
- Histórico mensal
- Meses pagos e pendentes
- Observações financeiras

---

### 3. Registrar pagamento manual

**Objetivo:** Registrar na ferramenta um pagamento confirmado por PIX, boleto ou transferência.

**Ações da Bruna:**

- Confirma o recebimento no banco ou por comprovante
- Localiza o associado na ferramenta
- Seleciona o mês de competência
- Informa a forma de pagamento
- Informa a data de pagamento
- Registra o valor recebido
- Salva o lançamento

**Formas de pagamento possíveis:** PIX · Boleto · Transferência bancária

**Resultado esperado:** O mês selecionado passa a constar como pago no controle financeiro do associado.

---

### 4. Registrar pagamento por desconto em folha — Brasil

**Objetivo:** Registrar manualmente os pagamentos identificados no relatório do SIGEPE.

**Ações da Bruna:**

- Recebe ou consulta o relatório do SIGEPE
- Confere os associados listados
- Localiza cada associado na ferramenta
- Seleciona a competência correspondente
- Registra o pagamento como desconto em folha (origem: SIGEPE)
- Salva o lançamento

**Resultado esperado:** Pagamento registrado como recebido por desconto em folha via SIGEPE.

---

### 5. Registrar pagamento por desconto em folha — Exterior

**Objetivo:** Registrar manualmente os pagamentos identificados no relatório do Itamaraty.

**Ações da Bruna:**

- Recebe ou consulta o relatório do Itamaraty
- Confere os associados lotados no exterior
- Localiza cada associado na ferramenta
- Seleciona a competência correspondente
- Registra o pagamento como desconto em folha (origem: Itamaraty)
- Salva o lançamento

**Resultado esperado:** Pagamento registrado como recebido por desconto em folha via Itamaraty.

---

### 6. Consultar pagamentos pendentes

**Objetivo:** Identificar associados sem pagamento registrado em determinada competência.

**Ações da Bruna:**

- Seleciona o mês desejado
- Filtra por pagamentos pendentes
- Visualiza associados sem registro de pagamento
- Decide se cobra, aguarda relatório ou confere manualmente

**Necessidade da interface:** Filtro por mês · Filtro por status · Lista de inadimplentes · Indicação da forma esperada de pagamento

---

### 7. Editar ou corrigir registro de pagamento

**Objetivo:** Corrigir erros de lançamento (mês, valor ou forma de pagamento incorretos).

**Ações da Bruna:**

- Acessa o histórico do associado
- Seleciona o lançamento
- Edita as informações necessárias
- Salva a correção com observação, quando necessário

**Campos editáveis:** Competência · Data de pagamento · Valor · Forma de pagamento · Origem · Observações

> A ferramenta deve permitir rastrear alterações, ainda que inicialmente de forma simples.

---

### 8. Visualizar resumo mensal

**Objetivo:** Ter uma visão geral da situação financeira do mês.

**Indicadores úteis:**

- Total de associados
- Total de pagamentos registrados
- Total de pendentes
- Valor total recebido
- Quantidade por forma de pagamento
- Quantidade por origem do pagamento

---

### 9. Registrar observações financeiras

**Objetivo:** Adicionar contexto administrativo sobre situações específicas.

**Exemplos:** Pagamento em atraso · Pagamento parcial · Associado aguardando boleto · Divergência no relatório · Pagamento identificado sem nome · Necessidade de conferência posterior

**Resultado esperado:** A informação deixa de ficar dispersa em e-mails, mensagens ou anotações externas.

---

## Jornada Resumida

```
Bruna acessa a intranet
↓
Entra na página de controle financeiro
↓
Consulta associados ou competência mensal
↓
Confere pagamentos recebidos ou relatórios externos
↓
Localiza o associado
↓
Registra manualmente o pagamento
↓
Informa competência, valor, data e origem
↓
Salva o lançamento
↓
Consulta pendências e resumo mensal
```

---

## Principais Dores Resolvidas pela Ferramenta

1. **Substituição da planilha** — centraliza o controle em uma tela própria
2. **Melhor organização dos dados** — campos estruturados em vez de marcações livres em células
3. **Busca mais eficiente** — localização de associados, competências e pagamentos com mais rapidez
4. **Menor risco de erro visual** — interface reduz problemas comuns de planilha
5. **Histórico mais claro** — cada pagamento com data, valor, origem, forma e observação
6. **Controle mensal mais objetivo** — visão rápida de quem pagou, quem está pendente e total recebido

---

## Requisitos Funcionais

| ID   | Requisito                                                                                    |
| ---- | -------------------------------------------------------------------------------------------- |
| RF01 | Listar associados cadastrados no sistema                                                     |
| RF02 | Pesquisar associado por nome                                                                 |
| RF03 | Filtrar por competência (mês/ano)                                                            |
| RF04 | Registrar pagamento manualmente                                                              |
| RF05 | Selecionar forma de pagamento (PIX, Boleto, Transferência, SIGEPE, Itamaraty)                |
| RF06 | Informar dados do pagamento: associado, competência, data, valor, forma, origem, observações |
| RF07 | Marcar competência como paga após lançamento                                                 |
| RF08 | Exibir associados sem pagamento em determinada competência                                   |
| RF09 | Editar lançamento já registrado                                                              |
| RF10 | Cancelar lançamento incorreto, mantendo registro para rastreabilidade                        |
| RF11 | Exibir resumo mensal: total recebido, quantidade de pagamentos, pendentes, total por forma   |
| RF12 | Registrar observações no lançamento ou no associado                                          |

---

## Requisitos Não Funcionais

| ID    | Requisito                                                                     |
| ----- | ----------------------------------------------------------------------------- |
| RNF01 | Interface simples e próxima da lógica da planilha atual                       |
| RNF02 | Baixa curva de aprendizado                                                    |
| RNF03 | Dados salvos em campos estruturados (sem texto livre como controle principal) |
| RNF04 | Rastreabilidade mínima: data, valor, origem, forma de pagamento               |
| RNF05 | Acesso restrito a usuários autorizados da intranet                            |

---

## Modelo Mental da Tela

### Bloco 1 — Filtros

- Competência · Nome do associado · Situação · Forma de pagamento · Origem

### Bloco 2 — Tabela de Controle

| Coluna            | Descrição                              |
| ----------------- | -------------------------------------- |
| Associado         | Nome do associado                      |
| Lotação           | Brasil ou Exterior                     |
| Forma esperada    | Forma de pagamento padrão do associado |
| Competência       | Mês/ano de referência                  |
| Status            | Situação do pagamento                  |
| Valor             | Valor registrado                       |
| Data do pagamento | Data em que o pagamento foi recebido   |
| Origem            | SIGEPE, Itamaraty, comprovante, etc.   |
| Ações             | Editar · Cancelar                      |

### Bloco 3 — Resumo Financeiro

- Cards: Total recebido · Pagamentos registrados · Pendentes · Valor por modalidade

---

## Status Possíveis

| Status             | Descrição                                                  |
| ------------------ | ---------------------------------------------------------- |
| **Pago**           | Pagamento confirmado e registrado                          |
| **Pendente**       | Nenhum pagamento registrado para a competência             |
| **Em conferência** | Há informação pendente de validação                        |
| **Divergente**     | Inconsistência de valor, competência ou identificação      |
| **Cancelado**      | Registro lançado incorretamente e posteriormente cancelado |

---

## Formas de Pagamento / Origem

**Pagamentos diretos:** PIX · Boleto · Transferência bancária  
**Descontos em folha:** SIGEPE (Brasil) · Itamaraty (Exterior)

---

## Resultado Esperado

A Bruna deixa de usar uma planilha como principal instrumento de controle e passa a utilizar uma página interna da intranet para registrar manualmente os pagamentos dos associados.

O processo continua **manual**, mas fica mais **organizado, pesquisável, estruturado e seguro**.
