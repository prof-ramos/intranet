# Base Legal Reference

Use this reference when building LGPD-ready checklists. It summarizes recurring article anchors; verify current legal text against official sources for final legal opinions.

Official sources:

- LGPD compiled law: https://www.planalto.gov.br/ccivil_03/_Ato2015-2018/2018/Lei/L13709compilado.htm
- ANPD regulations: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd
- ANPD Resolution CD/ANPD No. 2/2022: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- ANPD simplified processing record model for small processing agents: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-modelo-de-registro-simplificado-de-operacoes-com-dados-pessoais-para-agentes-de-tratamento-de-pequeno-porte-atpp

## Core LGPD Anchors

| Topic                         | Use for                                                                                                 | Legal basis            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| Scope and applicability       | Confirm whether LGPD applies to the operation                                                           | LGPD, arts. 1º, 3º, 4º |
| Definitions                   | Personal data, sensitive data, anonymized data, controller, operator, DPO, treatment                    | LGPD, art. 5º          |
| Principles                    | Purpose, adequacy, necessity, transparency, security, prevention, accountability                        | LGPD, art. 6º          |
| Legal basis for personal data | Consent, legal obligation, contract, legitimate interest, rights exercise, credit protection, etc.      | LGPD, art. 7º          |
| Consent proof and revocation  | Opt-in, records, revocation, purpose limitation                                                         | LGPD, art. 8º          |
| Transparency information      | Purpose, form/duration, controller identity, sharing, rights                                            | LGPD, art. 9º          |
| Legitimate interest           | Concrete legitimate purposes, strict necessity, transparency, possible DPIA                             | LGPD, art. 10          |
| Sensitive data                | Specific hypotheses for sensitive data treatment                                                        | LGPD, art. 11          |
| Children/adolescents          | Best interest and enhanced care                                                                         | LGPD, art. 14          |
| End of treatment              | When treatment ends                                                                                     | LGPD, art. 15          |
| Retention exceptions          | Legal/regulatory obligation, study, transfer, exclusive controller use with anonymization when possible | LGPD, art. 16          |
| Data subject rights           | Access, correction, anonymization, blocking, deletion, portability, information, revocation             | LGPD, art. 18          |
| Access response               | Simplified immediate response or complete declaration within 15 days                                    | LGPD, art. 19          |
| International transfer        | Permitted transfer hypotheses and safeguards                                                            | LGPD, arts. 33 a 36    |
| Processing records / ROPA     | Records of personal data processing operations                                                          | LGPD, art. 37          |
| Operator instructions         | Operator must process according to controller instructions                                              | LGPD, art. 39          |
| DPO / encarregado             | Appointment and channel with titulares/ANPD                                                             | LGPD, art. 41          |
| Security measures             | Technical and administrative safeguards                                                                 | LGPD, art. 46          |
| Incident response             | Security incident communication when relevant risk/damage exists                                        | LGPD, art. 48          |
| Good practices/governance     | Governance program and accountability measures                                                          | LGPD, art. 50          |
| Sanctions and mitigation      | ANPD sanctions and evaluation of good-faith/security/governance measures                                | LGPD, art. 52          |

## ANPD Small Processing Agent Anchors

Use when the organization may qualify as an agente de tratamento de pequeno porte. Do not assume qualification; ask for or verify facts about size, revenue/group, and high-risk processing.

| Topic                                     | Use for                                                                  | Legal basis                                |
| ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Definition of small processing agent      | Nonprofit/private entities and other small agents, subject to conditions | Resolucao CD/ANPD nº 2/2022, art. 2º       |
| Exclusions from simplified regime         | High-risk processing, revenue/group thresholds                           | Resolucao CD/ANPD nº 2/2022, art. 3º       |
| High-risk treatment criteria              | Evaluate broad/sensitive/vulnerable automated or surveillance scenarios  | Resolucao CD/ANPD nº 2/2022, art. 4º       |
| Simplification does not waive LGPD duties | Principles, bases, rights still apply                                    | Resolucao CD/ANPD nº 2/2022, art. 6º       |
| Rights channel                            | Electronic, printed, or other accessible channel                         | Resolucao CD/ANPD nº 2/2022, art. 7º       |
| Simplified processing record              | Simplified ROPA for art. 37 obligation                                   | Resolucao CD/ANPD nº 2/2022, art. 9º       |
| DPO dispensation/channel                  | If DPO appointment is dispensed, maintain communication channel          | Resolucao CD/ANPD nº 2/2022, art. 11       |
| Simplified security policy                | Essential security policy for small agents                               | Resolucao CD/ANPD nº 2/2022, art. 13       |
| Deadlines                                 | Some doubled deadlines and simplified declaration rules                  | Resolucao CD/ANPD nº 2/2022, arts. 14 e 15 |

## Checklist Template

| Item                                | Evidencia esperada                                                                                                      | Base legal                              | Status   | Risco                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- | ---------------------------------------------------------------- |
| Inventariar operacoes de tratamento | ROPA, planilha, tabela ou documento com dado, titular, finalidade, base legal, compartilhamento e retencao              | LGPD, art. 37; LGPD, arts. 6º e 7º      | Pendente | Alto se nao houver rastreabilidade                               |
| Definir base legal por fluxo        | Decisao registrada por tratamento, incluindo justificativa de consentimento/contrato/obrigacao legal/legitimo interesse | LGPD, arts. 7º, 8º, 10 e 11             | Pendente | Alto se houver coleta sem hipotese valida                        |
| Publicar aviso de privacidade claro | Politica com finalidade, forma/duracao, controlador, contato, compartilhamentos e direitos                              | LGPD, arts. 6º, VI, 9º e 41             | Pendente | Medio/alto conforme exposicao externa                            |
| Minimizar dados e logs              | Formularios, schemas, logs e eventos sem campos excessivos; redacao de PII                                              | LGPD, art. 6º, III e VII; LGPD, art. 46 | Pendente | Alto se logs contiverem CPF, SIAPE, tokens ou payloads sensiveis |
| Proteger dados sensiveis            | Inventario de dado sensivel, controles de acesso e base do art. 11                                                      | LGPD, arts. 5º, II, 11 e 46             | Pendente | Alto                                                             |
| Implementar direitos do titular     | Canal, SLA interno, playbook e trilha de resposta                                                                       | LGPD, arts. 18 e 19                     | Pendente | Medio/alto                                                       |
| Definir retencao e descarte         | Tabela de retencao por categoria, scripts/processo de descarte e excecoes                                               | LGPD, arts. 15, 16 e 46                 | Pendente | Medio                                                            |
| Mapear terceiros e transferencias   | Lista de operadores/subprocessadores, contratos, paises e salvaguardas                                                  | LGPD, arts. 33 a 36 e 39                | Pendente | Alto se houver transferencia internacional sem base              |
| Preparar resposta a incidente       | Runbook, contatos, criterio de risco/dano, evidencias sanitizadas                                                       | LGPD, arts. 46 e 48                     | Pendente | Alto                                                             |
| Demonstrar governanca               | Politicas, revisoes, tickets, aprovacoes, owners e controles periodicos                                                 | LGPD, arts. 6º, X, 37 e 50              | Pendente | Medio                                                            |
