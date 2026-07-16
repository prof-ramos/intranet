# Governança do CodeRabbit

Este runbook define como usar o CodeRabbit no repositório público
`prof-ramos/intranet`, com foco em revisão de PRs produzidos por pessoas e por
agentes como o Google Jules. A política busca aproveitar os recursos de open
source sem transformar cada push automático em uma nova revisão ruidosa.

## Plano open source e limites

A documentação atual distingue dois casos que não devem ser confundidos:

- o plano **Free** aceita repositórios públicos e privados, mas oferece apenas
  resumo de PR na integração; revisões de código ficam disponíveis na extensão
  e na CLI;
- projetos classificados como **Open Source** têm repositórios públicos
  ilimitados e recebem recursos Pro+ sem assinatura paga.

Portanto, manter o repositório público é necessário para o benefício OSS, mas
deve-se confirmar no painel de assinatura do CodeRabbit que o repositório está
efetivamente classificado na modalidade **OSS**, e não apenas no plano Free.

O benefício não significa capacidade ilimitada. A faixa OSS é adaptativa, usa
janelas móveis e varia conforme comunidade, popularidade e atualização do
serviço. Durante esta auditoria, a página ao vivo e o modelo do CLI retornaram
faixas diferentes; por isso, não copie uma cota numérica para decisões
operacionais. Consulte a tabela oficial atual e o saldo real no rodapé do
walkthrough, ou use o comando abaixo sem consumir uma revisão:

```text
@coderabbitai rate limit
```

Fontes: [planos e preços](https://docs.coderabbit.ai/management/plans) e
[FAQ de limites](https://docs.coderabbit.ai/faq).

## Estado observado em 2026-07-16

A configuração atual já tem bons controles:

- idioma e instruções de tom em português, sem poemas ou sugestões cosméticas;
- `profile: assertive`, drafts excluídos e revisão incremental desabilitada;
- instruções específicas para migrations, schema, queries, Server Actions,
  componentes e testes;
- scanners de segredo, dependências, SAST e PII habilitados;
- geração automática de docstrings, testes e simplificações desabilitada;
- `AGENTS.md`, `CLAUDE.md` e `DESIGN.md` usados como code guidelines.

No snapshot histórico gerado em 2026-07-16 contra o commit `cfd67eb`, havia 43
PRs abertos. Os 7 PRs com branch `jules-*`
estavam em draft e com o label `agent:jules`; nenhum PR tinha um label de
prontidão para revisão. Há ainda muitos PRs não draft cujos nomes de branch não
seguem `jules-*`. Como o Jules publica usando a conta humana `prof-ramos`,
`ignore_usernames` não consegue distinguir essas mudanças das contribuições
humanas. Draft e labels são os controles confiáveis. Para reproduzir o snapshot:

```bash
gh pr list --state open --limit 100 \
  --json number,isDraft,headRefName,labels,author
```

## Melhorias prioritárias

### P0 — revisão somente após aprovação humana

Adotar o label `review-ready` como opt-in, mantendo `drafts: false`. Para PRs do
Jules, o fluxo passa a ser:

1. publicar como draft com `agent:jules`;
2. revisar plano, diff e gates locais;
3. retirar o draft e aplicar `review-ready` apenas quando a revisão do
   CodeRabbit for desejada;
4. remover `review-ready` ou usar `@coderabbitai pause` durante uma sequência de
   correções;
5. solicitar uma única revisão incremental ao final.

Configuração recomendada:

```yaml
reviews:
  auto_review:
    enabled: false
    drafts: false
    labels:
      - 'review-ready'
      - '!do-not-review'
    auto_incremental_review: false
    auto_pause_after_reviewed_commits: 2
```

Labels positivos acionam a revisão mesmo com `enabled: false`; labels iniciados
por `!` excluem PRs. Revisões continuam disponíveis manualmente por comentário.
Essa combinação evita consumir a cota OSS em PRs incompletos ou em rajadas de
commits do Jules. Fonte: [controles de revisão automática](https://docs.coderabbit.ai/configuration/auto-review).

### P0 — restringir chat e aprendizagem no repositório público

No repositório público, o padrão permite que não membros interajam com o chat e
que o CodeRabbit responda sem menção. Isso amplia ruído e pode produzir
learnings a partir de conversas não governadas. Exigir menção explícita e
submeter novos learnings a uma janela de aprovação:

```yaml
chat:
  art: false
  allow_non_org_members: false
  auto_reply: false

knowledge_base:
  learnings:
    scope: local
    approval_delay: 7
  issues:
    scope: local
  pull_requests:
    scope: local
  mcp:
    usage: disabled
```

`scope: local` impede contaminação entre repositórios. Aguardar sete dias dá a
um administrador tempo para rejeitar uma regra acidental antes de ela ser
aplicada. Path instructions têm precedência sobre learnings; padrões estáveis
devem permanecer versionados em `AGENTS.md` ou na configuração, e learnings
devem registrar somente preferências incrementais. Fazer uma limpeza trimestral
e atualizar regras antigas em vez de acumular regras contraditórias.

O campo `allow_non_org_members: false` restringe chat a membros somente em
repositórios GitHub pertencentes a uma organização. `prof-ramos/intranet`
pertence a uma conta do tipo `User`, portanto esse campo fica como proteção para
uma futura migração, mas não deve ser tratado como barreira atual. Enquanto o
repositório permanecer pessoal, menções externas são entrada não confiável;
`auto_reply: false`, learnings locais com aprovação e moderação humana são os
controles efetivos. A elegibilidade para revisões automáticas não é alterada por
`allow_non_org_members`.

Fontes: [referência de configuração](https://docs.coderabbit.ai/reference/configuration),
[visão da knowledge base](https://docs.coderabbit.ai/knowledge-base) e
[gestão de learnings](https://docs.coderabbit.ai/knowledge-base/learnings).

### P0 — impedir mutações iniciadas pelo revisor

Embora geração de docstrings, testes e simplificação já estejam desativadas, o
Autofix é habilitado por padrão no schema atual. Para preservar a separação de
funções — CodeRabbit revisa, Jules/Codex propõem código e uma pessoa autoriza —
desabilitar explicitamente:

```yaml
reviews:
  enable_prompt_for_ai_agents: true
  finishing_touches:
    docstrings:
      enabled: false
    unit_tests:
      enabled: false
    simplify:
      enabled: false
    autofix:
      enabled: false
```

O prompt para agentes pode continuar habilitado: ele entrega instruções de
correção no comentário, mas não concede permissão para aplicar ou publicar a
mudança. Fonte: [referência de finishing touches](https://docs.coderabbit.ai/reference/configuration).

Há uma exceção que o schema YAML atual não permite desabilitar: os comandos
`@coderabbitai resolve merge conflict` / `fix merge conflict` podem produzir um
merge commit diretamente na branch. Como o repositório pertence a uma conta
pessoal e o bloqueio de não membros não é garantido, nunca use esse comando.
Também não declare a integração como totalmente read-only sem revisar as
permissões do GitHub App. Se for necessário bloquear tecnicamente essa ação,
migre o repositório para uma organização que suporte a restrição de chat ou
remova a permissão de escrita da integração, aceitando a perda de recursos que
dependem dela.

### P1 — usar os checks existentes sem duplicar o CI

O CodeRabbit pode aguardar GitHub Checks e incorporar falhas de lint, build,
testes e segurança à revisão. O timeout padrão é 90 segundos, menor que os
gates E2E deste repositório. Configurar o máximo suportado, 15 minutos:

```yaml
reviews:
  tools:
    github-checks:
      enabled: true
      timeout_ms: 900000
```

Não tornar o status do CodeRabbit o único check obrigatório da proteção de
`main`. A cota OSS é variável, `commit_status: true` indica que a execução
terminou e `fail_commit_status` é falso por padrão. Os checks obrigatórios do
GitHub e a resolução de conversas continuam sendo a fonte de bloqueio; o
CodeRabbit é uma camada adicional de revisão.

Os dois custom checks novos começam em `mode: warning` com
`request_changes_workflow: false`. Depois de 3 a 5 PRs `review-ready`, promova
um check para `error` somente se os resultados forem determinísticos e o fluxo
de override estiver testado. Até lá, checks obrigatórios do GitHub e resolução
de conversas continuam sendo a proteção bloqueante.

Fontes: [integração com GitHub Checks](https://docs.coderabbit.ai/tools/github-checks)
e [status na referência de configuração](https://docs.coderabbit.ai/reference/configuration).

### P1 — rotular slop sem fechar automaticamente

O CodeRabbit oferece detecção de PRs de baixa qualidade/AI slop apenas em
repositórios públicos no GitHub. Ela já é habilitada por padrão, mas não aplica
label sem configuração. Criar o label `ai-slop` e ativar:

```yaml
reviews:
  slop_detection:
    enabled: true
    label: 'ai-slop'
```

O resultado é sinal de triagem, não prova para fechar ou rejeitar um PR. A
ferramenta não bloqueia merge nem fecha PR automaticamente. Para PRs do Jules,
o label deve provocar revisão humana de duplicidade, escopo e utilidade antes
de qualquer correção. Fonte: [Slop Detection](https://docs.coderabbit.ai/pr-reviews/slop-detection).

### P1 — manter ferramentas de alto sinal

O CodeRabbit seleciona ferramentas conforme linguagens, arquivos e
configurações detectadas. Não há vantagem em ativar todo o catálogo. Neste
projeto, priorizar:

- ESLint para TypeScript/React;
- actionlint, ShellCheck, YAMLlint e markdownlint para automação e docs;
- SQLFluff para SQL;
- OSV-Scanner para dependências;
- um scanner principal de segredo com verificação e um scanner SAST principal;
- Presidio para PII/LGPD, que passou a ser opt-in e já está habilitado;
- GitHub Checks para reutilizar evidência dos gates oficiais.

Antes de remover ferramentas atualmente habilitadas em pares, comparar os
achados de algumas revisões; scanners diferentes podem ter cobertura
complementar. Desabilitar um scanner somente por duplicidade observada, não por
suposição. Fonte: [catálogo de ferramentas](https://docs.coderabbit.ai/tools/list).

### P2 — ajustar contexto e instruções com parcimônia

Path instructions devem complementar, e não copiar, a lógica geral do
CodeRabbit ou o conteúdo dos `AGENTS.md`. Melhorias úteis para este repositório:

- ampliar code guidelines de `AGENTS.md` para `**/AGENTS.md` e incluir
  `CONTEXT.md` e `docs/environments.md`;
- adicionar instruções focadas para `src/lib/auth/**`, `src/proxy.ts`, rotas de
  cron/webhook e código de criptografia de PII;
- instruir mudanças de schema/migration a conferir também
  `src/lib/db/schema.integration.test.ts` e o journal;
- excluir artefatos locais como `coverage/**`, `playwright-report/**` e
  `test-results/**`, se algum deles passar a ser versionado.

Observar revisões reais antes de adicionar uma nova regra. Se uma exigência é
estável e transversal, documentá-la como code guideline; se é específica de um
caminho, usar path instruction; se é critério binário de merge, avaliar um
custom pre-merge check. Fonte: [path instructions e filters](https://docs.coderabbit.ai/configuration/path-instructions).

## Perfil de revisão

O schema atual oferece `quiet`, `chill` e `assertive`. O perfil `assertive`
existente é defensável por causa de LGPD, autenticação e migrations. Primeiro
reduzir o volume com opt-in por label e manter as instruções contra comentários
cosméticos. Só migrar para `chill` se, após algumas revisões `review-ready`, a
maioria dos comentários ainda não for acionável. `quiet` deve ficar reservado a
um cenário de ruído persistente, pois pode esconder achados relevantes.

Fonte: [referência de perfis](https://docs.coderabbit.ai/reference/configuration).

## Comandos operacionais

```text
@coderabbitai rate limit       # consulta saldo sem iniciar revisão
@coderabbitai review           # revisa apenas mudanças novas
@coderabbitai full review      # reinicia revisão completa
@coderabbitai pause            # interrompe revisões automáticas no PR
@coderabbitai resume           # retoma revisões
@coderabbitai ignore           # somente na descrição; ignora esse PR
@coderabbitai configuration    # mostra configuração efetiva
@coderabbitai help             # lista comandos disponíveis
```

`@coderabbitai resolve` resolve todos os comentários do CodeRabbit de uma vez.
Não usar como atalho: confirmar individualmente que cada recomendação foi
implementada, rejeitada com justificativa ou tornou-se obsoleta. Fonte:
[comandos de revisão](https://docs.coderabbit.ai/reference/review-commands).

## Checklist de adoção

1. Confirmar no painel que `prof-ramos/intranet` está classificado como OSS.
2. Criar `review-ready`, `do-not-review` e `ai-slop` no GitHub.
3. Aplicar as mudanças P0 na `.coderabbit.yaml` e validar pelo schema oficial.
4. Configurar GitHub Checks com timeout de 15 minutos e ativar o label anti-slop.
5. Aplicar `review-ready` somente depois da triagem humana do PR draft.
6. Executar `@coderabbitai configuration` no PR de governança e conferir a
   configuração efetiva da própria branch — o CodeRabbit usa o YAML da branch
   em revisão.
7. Monitorar três a cinco revisões e ajustar perfil/ferramentas com evidência.
8. Revisar learnings trimestralmente e remover regras antigas ou conflitantes.

O arquivo deve permanecer na raiz com o nome `.coderabbit.yaml`; a configuração
da branch do PR é a usada para revisar aquele PR. Adicionar ao início do arquivo:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
```

Validar no [editor oficial de YAML](https://docs.coderabbit.ai/configuration/yaml-validator)
ou no modo **YAML Editor** das configurações do repositório antes de mergear.
Fonte: [configuração por YAML](https://docs.coderabbit.ai/getting-started/yaml-configuration).
