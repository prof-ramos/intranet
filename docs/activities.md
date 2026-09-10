# Atividades

O módulo de Atividades é implementado na intranet existente: Server Actions, camada de domínio em `src/lib/activities`, Drizzle/PostgreSQL, auditoria e outbox de webhooks. A evolução de comentários mantém o Drawer e o fluxo de atualização existentes; não cria um segundo board nem duplica regras de negócio na UI.

## Licença e referências

O repositório não incorpora código, componentes ou assets de `kanbn/kan`. O Kan pode ser consultado somente como referência funcional/UX. O código desta implementação é original e segue as licenças e convenções deste repositório; nenhuma dependência AGPL foi adicionada.

## Comentários

- `activity_comments` usa exclusão lógica (`deleted_at`) e preserva o histórico.
- Inserção, edição e exclusão geram o evento correspondente no outbox na mesma transação da mutação.
- A auditoria de comentários é estrita e não registra o conteúdo; registra apenas `contentLength`.
- Somente o autor pode editar. Ações de comentários exigem os papéis `admin`, `diretoria` ou `secretaria`.
- A feature flag `ACTIVITY_COMMENTS_ENABLED` controla o acesso, com padrão habilitado.
