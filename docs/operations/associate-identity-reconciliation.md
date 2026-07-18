# Reconciliação administrativa de identidades

Use este procedimento somente depois da higiene operacional do Plano 057 e
antes da migration de unicidade do Plano 059. O comando nunca deve ser usado
para decidir manualmente entre valores cadastrais: qualquer ambiguidade exige
STOP e análise nominal em uma superfície privada e autorizada.

## Relatório seguro

```bash
npm run db:reconcile-associate-identities
```

O modo padrão é `report` e abre uma transação PostgreSQL `REPEATABLE READ READ
ONLY`. A saída contém somente IDs técnicos, contagens, códigos de conflito e o
`evidenceHash`. Não arquive stdout/stderr de outras ferramentas junto com essa
evidência.

Se houver `ambiguousCount > 0` ou `globalConflictCodes`, não execute `apply`.
O relatório é uma evidência de decisão, não uma autorização para inspecionar ou
exportar CPF, SIAPE, e-mail, blind indexes, ciphertext ou payload de origem.

## Aplicação explícita

Na janela autorizada, gere outro relatório imediatamente antes da aplicação e
use exatamente o hash recém-produzido:

```bash
npm run db:reconcile-associate-identities -- apply --evidence-hash <sha256>
```

O comando adquire o advisory lock e um bloqueio temporário de escrita nas sete
tabelas envolvidas antes de recalcular a evidência. Hash divergente, inventário
de FK inesperado ou um único componente ambíguo aborta a transação completa.
Não existe aplicação parcial.

Após sucesso, rode `report` novamente e exija `componentCount: 0`. Só então a
migration do Plano 059 pode prosseguir.

## Evidência arquivada

Crie o registro real em `docs/operations/archive/` somente após a execução. O
arquivo pode conter: ambiente nominal, SHA completo do deployment/commit,
horário, `evidenceHash`, contagens agregadas, códigos de conflito agregados e o
resultado do relatório pós-aplicação. Não inclua nomes, valores cadastrais,
blind indexes, ciphertext, URLs de conexão ou mensagens brutas do PostgreSQL.
