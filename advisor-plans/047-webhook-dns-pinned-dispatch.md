# Plano 047: Fixar a conexão webhook aos IPs aprovados pelo SSRF gate

> **Instruções ao executor**: leia a documentação atual do Undici via Context7
> antes de implementar. Não desabilite validação TLS e não aceite uma segunda
> resolução DNS como equivalente a pinning.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/webhooks/validation.ts src/lib/integrations/webhooks/service.ts src/lib/integrations/webhooks/service.test.ts package.json package-lock.json`
> O Plano 046 deve estar aplicado.

## Status

- **Prioridade**: P1
- **Esforço**: L
- **Risco**: ALTO
- **Depende de**: Plano 046
- **Categoria**: segurança
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O gate resolve e valida DNS, mas `fetch(subscription.targetUrl)` resolve de novo.
Um domínio controlado pode fornecer IP público na validação e privado na conexão.
O transporte deve usar exatamente a lista aprovada, preservando hostname para
HTTP Host e TLS SNI/certificado.

## Estado atual

- `validation.ts:89-109` resolve todas as respostas e rejeita as classificadas
  como privadas.
- `service.ts:110-129` chama a validação antes do envio.
- `service.ts:151-166` usa `fetch(URL)` sem transportar os IPs aprovados.
- Redirects já usam `redirect: 'manual'` e são bloqueados; preserve isso.
- Context7 `/nodejs/undici` confirma que o DNS interceptor/Agent aceita `lookup`
  customizado e preserva `origin.hostname` como SNI/Host ao conectar ao IP
  retornado. `fetch(url, { dispatcher })` usa esse dispatcher.

## Comandos necessários

| Finalidade     | Comando                                                                                           | Resultado esperado          |
| -------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| Webhooks       | `npx vitest run src/lib/integrations/webhooks/service.test.ts src/lib/validation/schemas.test.ts` | todos passam                |
| Auditoria deps | `npm audit --omit=dev`                                                                            | 0 HIGH/CRITICAL de produção |
| Gates          | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build`           | todos saem 0                |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/webhooks/validation.ts`
- `src/lib/integrations/webhooks/service.ts` e teste
- helper de transporte em `src/lib/integrations/webhooks/`
- `package.json`/`package-lock.json` apenas se `undici` precisar ser dependência direta
- `advisor-plans/README.md`

**Fora do escopo**:

- Proxy externo/egress de infraestrutura sem decisão do operador.
- Desabilitar `rejectUnauthorized`, trocar HTTPS por HTTP ou alterar payload/HMAC.
- Seguir redirects.
- Compartilhar dispatcher entre hosts sem chaveamento seguro.

## Fluxo Git

- Branch: `advisor/047-webhook-dns-pinned-dispatch`
- Commit: `fix(webhooks): pin outbound connections to validated ips`
- Não publique sem autorização.

## Etapas

### Etapa 1: Retornar um alvo validado, não só boolean

Extraia uma função que parseie URL, resolva todas as famílias, classifique cada
endereço e retorne `{ url, hostname, addresses }` somente quando todos forem
permitidos. `isPublicWebhookUrl` pode permanecer wrapper boolean para formulários.
Falha/timeout continua fail-closed.

**Verificar**: testes provam que o objeto contém apenas endereços resolvidos e
aprovados, sem nova consulta implícita.

### Etapa 2: Implementar dispatcher pinado

Use Undici compatível com Node 20 do CI. Crie Agent/dispatcher por entrega ou por
alvo isolado, com lookup que devolva apenas `addresses` capturados. Preserve URL
original para Host/SNI e validação normal de certificado. Feche o dispatcher em
`finally` para não vazar sockets/timers. Se adicionar dependência direta, escolha
versão compatível, atualize lockfile via npm e rode audit.

**Verificar**: teste do helper prova lookup pinado, SNI/hostname original e close
em sucesso, erro e timeout.

### Etapa 3: Integrar ao envio

Em `deliverEventToSubscription`, obtenha o alvo validado e envie pelo dispatcher.
Não chame `fetch` global depois de validar. Preserve timeout, HMAC, headers,
sanitização, retry e bloqueio de redirect.

**Verificar**: teste injeta DNS controlado que alternaria público/privado e prova
que a conexão recebe somente o IP inicialmente aprovado.

### Etapa 4: Rodar gates e auditoria

Rode testes, audit de produção e gates oficiais. Confirme que não há
`rejectUnauthorized: false` nem resolução secundária no path de entrega.

## Plano de testes

- DNS com qualquer IP privado é rejeitado.
- DNS aprovado é pinado no dispatcher; mudança posterior não altera destino.
- Host/SNI continuam o hostname original.
- TLS permanece validado; redirects continuam bloqueados.
- Dispatcher fecha em todos os caminhos.

## Critérios de conclusão

- [ ] A conexão usa somente IP previamente validado.
- [ ] Host/SNI e validação TLS são preservados.
- [ ] Não existe segunda resolução não controlada.
- [ ] Sem vazamento de dispatcher/socket.
- [ ] Audit e gates passam; índice atualizado.

## Condições de STOP

- Runtime Vercel/Next não aceita dispatcher/Agent Undici nesse caminho.
- A versão compatível exige desabilitar TLS ou usa API experimental não estável.
- Teste não consegue demonstrar destino pinado.
- Solução segura exige proxy de egress; reporte proposta de infraestrutura.

## Notas de manutenção

Pinning precisa ocorrer em cada nova conexão; pooling e retries não podem voltar a
resolver o hostname fora do dispatcher validado. Reconfirme a API do Undici em
upgrades de Node.
