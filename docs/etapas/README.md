# Guia Vibe Coded — Índice

> **Desenvolvimento de software comprimido por IA**

```
┌─────────────────────────────────────────────┐
│  TEMPO TOTAL: 15-30 horas (vs 80-160h)      │
│  EFICIÊNCIA: 5-6x mais rápido              │
│  QUALIDADE: Código revisado, testado        │
└─────────────────────────────────────────────┘
```

---

## Etapas

| # | Etapa | Tempo | Saída |
|---|-------|-------|-------|
| 0 | [Sumário](./00-sumario.md) | 5min | Visão geral |
| 1 | [Preparação](./01-preparacao.md) | 1-2h | Ambiente pronto |
| 2 | [Especificação](./02-especificacao.md) | 2-4h | PRD + contexto |
| 3 | [Arquitetura](./03-arquitetura.md) | 1-2h | Estrutura técnica |
| 4 | [Geração](./04-geracao.md) | 4-8h | Código base |
| 5 | [Revisão](./05-revisao.md) | 2-4h | Código validado |
| 6 | [Refino](./06-refino.md) | 2-4h | Código polido |
| 7 | [Testes](./07-testes.md) | 2-3h | Suíte testando |
| 8 | [Documentação](./08-documentacao.md) | 1-2h | Docs completos |
| 9 | [Entrega](./09-entrega.md) | 1h | Deploy + handoff |

---

## Mentalidade

```
VIBE CODED                   TRADICIONAL
─────────────────────────────────────────
Orquestrar      vs    Escrever cada linha
Revisar         vs    Criar do zero
Iterar rápido   vs    Planejar tudo
Confiança +     vs    Desconfiança total
verificação

Prompt é a     vs    PHP/JS é a linguagem
nova linguagem
```

---

## Stack Recomendado

| Categoria | Ferramenta |
|-----------|-----------|
| **Orquestração** | Claude Code / Cursor |
| **Geração** | Claude Opus 4 |
| **Revisão** | Claude Sonnet 4 |
| **Autocompletar** | Copilot / Cursor |
| **Testes** | Pest + IA |
| **Documentação** | Claude Haiku 4 |

---

## Fluxo Típico

```bash
# 1. Preparação (1x por projeto)
./docs/etapas/01-preparacao.md

# 2. Especificar
/claude "Leia docs/prd.md e crie especificação"

# 3. Gerar código
/claude "Crie migration, model e factory para Task"

# 4. Revisar
/claude "Revise Task.php aponte bugs"

# 5. Refinar
/claude "Refatore Task.php seguindo Clean Code"

# 6. Testar
/claude "Gere testes para Task model"

# 7. Documentar
/claude "Gere README.md com instruções"

# 8. Entregar
git push && gh release create v1.0.0
```

---

## Dicas de Ouro

### ✅ Faça

- Commits pequenos e frequentes
- Revisar tudo antes de aceitar
- Testar manualmente cada mudança
- Pedir refatoração proativa
- Documentar decisões (ADRs)

### ❌ Evite

- Gerar tudo de uma vez
- Aceitar código sem testar
- Pular etapas de revisão
- Ignorar avisos da IA
- Esquecer de versionar

---

## Próximos Passos

1. **Primeiro projeto**: Siga todas as etapas
2. **Segundo projeto**: Adapte ao seu estilo
3. **Terceiro projeto**: Crie seus próprios templates
4. **Evolução**: Compartilhe suas descobertas

---

## Referências

- [Claude Code Docs](https://claude.ai/claude-code)
- [Cursor AI](https://cursor.sh)
- [Laravel Docs](https://laravel.com/docs)
- [Clean Code PHP](https://github.com/jupeter/clean-code-php)

---

**Versão**: 1.0
**Última atualização**: 2025-03-18

---

**Comece**: [00-sumario.md](./00-sumario.md) → [01-preparacao.md](./01-preparacao.md)
