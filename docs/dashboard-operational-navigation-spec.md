# Dashboard operacional e navegação

## Intenção funcional

O dashboard inicial deve funcionar como uma área de despacho operacional para a equipe autenticada da ASOF: os números precisam levar à fila correspondente, e as pendências vencidas precisam expor rapidamente título, responsável e prazo.

## Comportamento esperado

- Todos os indicadores exibidos no dashboard são links para a visão filtrada correspondente, inclusive o indicador de inadimplentes.
- O bloco de pendências vencidas exibe título, prioridade, responsável e prazo quando disponíveis.
- O link geral do bloco abre `/app/atividades?dueLate=1`; cada pendência abre a mesma fila com `open=<id>` para permitir a retomada do item.
- Não há cartão de placeholder para uma comunicação ainda não implementada.
- A navegação lateral é agrupada em `Operação`, `Cadastro` e `Gestão`, preservando a visibilidade condicionada ao papel do usuário.

## Limites de acesso

O agrupamento visual não altera autorização. As rotas continuam protegidas pelo modelo de autenticação e autorização existente, e a navegação deve manter estas regras:

- `secretaria` não vê Financeiro, Relatórios ou Configurações.
- `diretoria` não vê a ação “E-mails com IA”.
- `admin` vê todas as opções previstas para seu papel.

## Critérios de QA

- Para `admin`, `diretoria` e `secretaria`, o dashboard carrega sem erro e a ordem dos grupos laterais permanece `Operação`, `Cadastro`, `Gestão`.
- Cada indicador tem nome acessível e destino navegável.
- O bloco de pendências vencidas mantém alvo de toque confortável no mobile e densidade reduzida no desktop.
- O conteúdo de responsável só é renderizado dentro da área autenticada do dashboard.
