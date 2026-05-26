# ADR 011: Owners De Incidente Para O Dia 1

Status: accepted
Data: 2026-05-26

## Contexto

O `TODO-PROD.md` exigia registrar owners de incidente para app, banco, Vercel, Mailjet, DNS e LGPD. Com o ADR 008 (Documentos fora) e o ADR 007 (entrega em tempo real fora), a superficie de dominios criticos do dia 1 diminuiu. A ASOF tem equipe interna enxuta (admin, diretoria, secretaria) e nao possui time tecnico distribuido. Definir owners "de papel" que nao respondem rapido seria pior do que registrar uma cadeia curta e realista.

## Decisao

Estrutura minima de owners para o primeiro go-live:

- **Owner tecnico primario (app, banco Neon, Vercel, DNS, Mailjet):** Gabriel Ramos. Responsavel por executar smoke (ADR 009), acionar rollback (ADR 010), repontar envs no Vercel e operar o console Neon.
- **Owner de decisao de negocio / substituto:** um membro nomeado da Diretoria Executiva (presidente ou VP). Autoridade para autorizar rollback, pausar a janela e comunicar interrupcao aos associados. Substitui o primario apenas em decisoes de negocio; nao executa intervencao tecnica.
- **Owner LGPD / titular de relacao com o titular de dados:** Encarregado (DPO) formalizado pela ASOF, se existir. Enquanto a formalizacao nao ocorrer, a Diretoria nomeada acumula esse papel e a formalizacao do DPO fica como divida pos-estreia.
- **Owner de smoke (papel da janela):** a mesma pessoa que executa o smoke conforme ADR 009, presencialmente disponivel durante toda a janela.

**Canal de incidente unico**: grupo dedicado (WhatsApp/Signal/Telegram) com primario, substituto e DPO. Sem on-call rotativo 24/7; o compromisso e que o canal seja monitorado pelo primario durante a janela e pelas 48h seguintes.

**Privacidade dos contatos:** o `TODO-PROD.md` registra apenas papeis. Nomes e contatos pessoais ficam em anexo privado fora do repo (gestor de senhas ou documento interno da ASOF).

## Opcoes Rejeitadas

- **Matriz completa por dominio com owner distinto para cada (app, banco, Vercel, Mailjet, DNS, LGPD)**: rejeitado. A ASOF nao tem cadeiras tecnicas para preencher; vira ficcao operacional e atrasa o go-live.
- **On-call rotativo 24/7**: rejeitado. Inviavel para o tamanho atual da operacao.

## Consequencias

- O `TODO-PROD.md` registra os papeis (sem nomes pessoais) e marca o item como concluido.
- A formalizacao do DPO fica como item pos-estreia em backlog LGPD.
- Em incidentes fora da janela, a expectativa de resposta e melhor-esforco do primario; comunicar isso a Diretoria antes do go-live.
- Pos-estreia, avaliar contratar suporte tecnico externo de plantao se o crescimento de uso justificar.
