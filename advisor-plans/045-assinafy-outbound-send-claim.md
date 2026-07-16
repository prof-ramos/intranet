# Plano 045: Adquirir claim atômico antes do envio de Ofício à Assinafy

> **Instruções ao executor**: não faça chamadas reais à Assinafy nos testes. Não
> altere o webhook inbound, já tratado pelos Planos 036/037. Pare se o provider
> exigir compensação ou retry automático não especificado.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/oficios/service.ts src/lib/oficios/service.test.ts src/lib/oficios/service.integration.test.ts src/lib/assinafy/repository.ts src/lib/assinafy/repository.test.ts src/lib/db/schema/oficios.ts`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

`sendForSignature` verifica `assinafyDocumentId` e só persiste estado depois de
upload, criação de signatário e assignment. Duas chamadas concorrentes podem
passar pela verificação e criar dois fluxos externos; a última gravação vence e
deixa recursos órfãos. Um compare-and-set no banco deve escolher um único vencedor
antes de qualquer efeito externo.

## Estado atual

- `oficios/service.ts:200-217`: leitura + check de idempotência sem lock/CAS.
- `oficios/service.ts:225-258`: três efeitos externos ocorrem antes da escrita.
- `oficios/service.ts:284-306`: campos Assinafy são persistidos apenas ao final.
- `assinafy/repository.ts:47-61`: `updateAssinafyFields` atualiza só por `oficioId`,
  sem condição de estado anterior.
- `db/schema/oficios.ts:21-34` já possui estados intermediários como `uploading`
  e `failed`; evite migration se esses estados forem suficientes.
- Exemplo de claim atômico: `integrations/webhooks/repository.ts:174-199` usa um
  único UPDATE condicional com RETURNING.

## Comandos necessários

| Finalidade | Comando                                                                                 | Resultado esperado              |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| Unitário   | `npx vitest run src/lib/oficios/service.test.ts src/lib/assinafy/repository.test.ts`    | todos passam                    |
| Integração | `node scripts/run-integration-tests.mjs`                                                | passa ou skip explícito sem env |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0                    |

## Escopo

**Dentro do escopo**:

- `src/lib/oficios/service.ts` e teste
- `src/lib/assinafy/repository.ts` e teste
- `src/lib/oficios/service.integration.test.ts` para CAS real, se DB disponível
- `advisor-plans/README.md`

**Fora do escopo**:

- Webhook Assinafy inbound, schemas/event IDs ou Planos 036/037.
- Migration, salvo se os estados existentes forem comprovadamente insuficientes.
- Retry automático após efeito externo parcial.
- Deletar/compensar recursos no provider sem API documentada e decisão operacional.

## Fluxo Git

- Branch: `advisor/045-assinafy-outbound-send-claim`
- Commit: `fix(assinafy): claim oficio before external submission`
- Não publique sem autorização.

## Etapas

### Etapa 1: Implementar claim compare-and-set

Crie no repository uma função que faça UPDATE condicional do Ofício elegível:
ID correto, `assinafyDocumentId IS NULL` e estado que ainda permita primeiro
envio. Grave `assinafyStatus='uploading'`, `updatedBy`, limpe erro anterior e use
`RETURNING`. Resultado nulo significa claim perdido ou item inelegível.

**Verificar**: teste do repository prova condição no WHERE e retorno nulo quando
outro processo já venceu.

### Etapa 2: Mover o claim antes de PDF/provider

Em `sendForSignature`, valide configuração, e-mail e existência; adquira o claim
antes de gerar PDF ou instanciar o cliente. Só o vencedor continua. O perdedor
retorna mensagem segura de “envio já iniciado/concluído” e não chama nenhuma API.

**Verificar**: teste com duas promises concorrentes mantém contadores de
`uploadDocument`, `createSigner` e `createAssignment` em exatamente 1.

### Etapa 3: Finalizar e falhar condicionalmente

Faça a atualização final somente se o Ofício ainda estiver no estado reclamado.
Em erro antes de haver confirmação externa, marque `failed` de modo condicional e
registre apenas contexto sanitizado. Em falha após criação de recurso externo,
persista IDs já conhecidos/erro para reconciliação e não libere automaticamente
um segundo envio cego.

**Verificar**: testes cobrem falha antes do upload, após upload e claim perdido na
finalização; nenhum caminho sobrescreve estado de outra operação.

### Etapa 4: Provar atomicidade com PostgreSQL real

No teste de integração, lance dois claims simultâneos contra o mesmo Ofício
sintético e confirme um único vencedor. Não faça rede; teste apenas CAS/estado.

**Verificar**: `test:integration` passa no banco dedicado e limpa fixtures.

### Etapa 5: Rodar gates

Execute a sequência oficial e confirme diff restrito.

## Plano de testes

- Claim elegível vence uma vez.
- Segundo claim concorrente retorna nulo e não chama provider.
- Ofício já enviado/inelegível não é reclamado.
- Falha parcial persiste estado recuperável sem expor PII/segredo.
- Finalização usa compare-and-set e não last-write-wins.

## Critérios de conclusão

- [ ] Nenhum efeito externo ocorre antes do claim.
- [ ] Concorrência produz exatamente um fluxo Assinafy.
- [ ] Falhas parciais não reabrem retry cego.
- [ ] Teste real-PG prova um vencedor.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Estados atuais não distinguem claim ativo de falha recuperável.
- Recuperação segura exige idempotency key ou consulta ao provider não disponível.
- A correção requer migration; reporte proposta separada antes de criá-la.
- Um teste exigiria credencial/rede Assinafy real.

## Notas de manutenção

O estado `uploading` passa a ser lock operacional. Futuras rotinas de recuperação
devem usar idade/IDs persistidos e nunca simplesmente limpar o estado.
