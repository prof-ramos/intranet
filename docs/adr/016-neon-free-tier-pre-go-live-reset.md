# ADR 016: Reset Pré-Go-Live Do Neon Free Tier

Status: accepted
Data: 2026-06-18

## Contexto

A intranet ainda não estava em produção real, mas o banco Neon já continha dados
parciais e PII criptografada criada por caminhos alternativos de agentes. A chave
original de `ENCRYPTION_MASTER_KEY` não estava presente no ambiente local nem nas
variáveis da Vercel. Sem essa chave, ciphertexts existentes não podem ser
descriptografados; criar uma chave nova sem limpar ou reimportar os dados manteria
o banco em estado inválido.

O projeto usa Neon via Vercel Storage Integration no Free Tier. A documentação da
Neon limita Instant Restore/Time Travel do Free Tier a 6 horas, então PITR sozinho
não é política suficiente para reset destrutivo.

## Decisão

Tratar o Neon `main` como banco oficial de pré-go-live e reiniciá-lo de forma
controlada. "Banco do zero", nesta decisão, significa resetar o schema público e
o journal de migrations dentro do projeto Neon/Vercel Storage atual; não significa
apagar o projeto Neon, recriar a integração Vercel ou introduzir outro endpoint
canônico.

1. criar branch backup copy-on-write antes do reset;
2. gerar dump local comprimido usando conexão direta;
3. limpar `public` e o journal `drizzle`;
4. reaplicar todas as migrations versionadas;
5. executar `npm run db:seed`;
6. gerar uma nova `ENCRYPTION_MASTER_KEY` oficial;
7. registrar a chave em `.env.local` e na Vercel Production;
8. validar o schema e a aplicação antes de qualquer go-live real;
9. manter dados reais fora do desenvolvimento diário até a importação oficial
   pré-go-live;
10. criar um seed sintético robusto separado do seed E2E para desenvolvimento
    manual, dashboards, filtros e relatórios, cobrindo associados,
    mensalidades, atividades, consultas jurídicas e ofícios.

Os ciphertexts antigos são considerados descartáveis porque o sistema ainda não
estava em produção real e a chave correspondente não estava disponível. O estado
autoritativo passa a ser o banco migrado do zero, não os dados criptografados
antigos.

Até a importação oficial, associados reais não devem ser reintroduzidos no banco
de desenvolvimento diário. A experiência de desenvolvimento deve usar dados
sintéticos sem PII real; o seed E2E permanece dedicado a testes determinísticos e
não substitui o seed de desenvolvimento. O seed de desenvolvimento deve simular
volume moderado e relações entre módulos para revelar problemas de UI, filtros,
relatórios e dashboard antes da importação real.

## Consequências

- O `main` fica limpo, migrado e seedado, sem PII antiga inválida.
- A recuperação do estado anterior depende do branch backup Neon ou do dump local
  gerado antes do reset, não apenas da janela de PITR do Free Tier.
- A partir desta decisão, qualquer troca de `ENCRYPTION_MASTER_KEY` exige plano
  explícito de recriptografia ou reset pré-go-live documentado.
- Depois do go-live real, reset destrutivo do `main` deixa de ser aceitável; usar
  migration corretiva, restore controlado ou janela operacional aprovada.
- Variáveis injetadas pela Vercel Storage Integration podem coexistir, mas o
  contrato operacional da aplicação é `DATABASE_URL`, `DATABASE_MIGRATION_URL` e
  `ENCRYPTION_MASTER_KEY`.

## Evidência De Execução

- Branch backup Neon: `backup/pre-reset-20260618T191453Z`.
- Dump local ignorado pelo Git: `backups/neon/pre-reset-main-20260618T191518Z.sql.gz`.
- Após reset: `admins=1`, `associates=0`, `drizzle.__drizzle_migrations=25`.

## Opções Rejeitadas

- Gerar chave nova sem limpar os ciphertexts antigos: rejeitado porque quebraria
  leituras de PII.
- Depender apenas de PITR: rejeitado porque o Free Tier limita a janela a 6 horas.
- Manter banco local ou branch `vercel-dev` como autoridade: rejeitado porque o
  projeto precisa de um único estado canônico antes do go-live.
