# ADR 006: Autorização de Contatos com Policies

## Decisão

Implementar ContactPolicy e registro explícito de Policies no AppServiceProvider (Laravel 11).

## Drivers

- Segurança: ContactController sem Policy expunha dados (Vulnerabilidade IDOR)
- Padrão Laravel: Policies são o método padrão de autorização (junto aos Gates)
- Bugs descobertos: A TaskPolicy local NUNCA foi registrada por omissão no AppServiceProvider.

## Alternativas Consideradas

1. **Checks inline em cada método** - Descartada por duplicação de responsabilidade e acoplamento desnecessário, além de dificuldade de escalabilidade nos testes unitários.
2. **Middleware customizado** - Descartada por não usar padrão Laravel oficial.
3. **Authorization em Services** - Descartada por misturar regras de resposta/HTTP às regras de negócio.

## Consequências

- Positiva: Autorização consistente, unificada e testável
- Positiva: Padrão estabelecido para outras entidades na plataforma.
- Negativa: Contatos existentes sem owner ficam acessíveis a todos
- Mitigação: Contatos criados previamente foram associados na migration a uma identificação null na FK (created_by=null), ou seja, como "Contato de Sistema" para não quebrar a aplicação.

## Problemas Corrigidos durante implementação

- Contact não tinha created_by - adicionado via migration.
- TaskPolicy não funcionava (não registrada) - adicionado registro explícito e limpo no AppServiceProvider.
- Duplicate ContactController em Api/ - apagado um arquivo órfão solto em Api/ ignorado pelo framework.

## Follow-ups

- Planejar Phase 2 para Policies estagnadas de MeetingRecord, Notice, QuickLink.
- Criar ADR paralela para migração de construto do admin-by-email para role hierarchies definitivas.
