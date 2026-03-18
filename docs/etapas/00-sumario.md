# Fluxo Vibe Coded — Visão Geral

> **Vibe Coded**: Desenvolvimento de software comprimido por IA, onde o desenvolvedor orquestra, revisa e refina código gerado por ferramentas como Claude, Copilot, etc.

---

## Filosofia

```text
┌─────────────────────────────────────────────────────────────┐
│  TRADICIONAL                    VIBE CODED                  │
├─────────────────────────────────────────────────────────────┤
│  Escrever cada linha            Orquestrar gerações         │
│  Debug manual                   Revisão sistemática         │
│  Documentação posterior         Documentação integrada      │
│  Semanas → Meses                Horas → Dias                │
└─────────────────────────────────────────────────────────────┘
```text

## Princípios

1. **Prompt Engineering é a nova linguagem de programação**
2. **Revisão > Criação** — seu valor está em discernir o bom do ruim
3. **Iteração Rápida** — ciclos curtos de feedback
4. **Verificação Obrigatória** — nunca confie cegamente
5. **Contexto é Rei** — alimente a IA com informação estruturada

---

## Etapas do Fluxo

| Etapa                | Duração | Saída              | Responsabilidade   |
| -------------------- | ------- | ------------------ | ------------------ |
| **0. Setup**         | 1-2h    | Ambiente pronto    | Dev                |
| **1. Especificação** | 2-4h    | PRD + Contexto     | Dev + IA           |
| **2. Arquitetura**   | 1-2h    | Estrutura técnica  | Dev + IA           |
| **3. Geração**       | 4-8h    | Código base        | IA (Dev orquestra) |
| **4. Revisão**       | 2-4h    | Código validado    | Dev                |
| **5. Refino**        | 2-4h    | Código polido      | Dev + IA           |
| **6. Testes**        | 2-3h    | Suíte testando     | IA + Dev           |
| **7. Documentação**  | 1-2h    | Docs completos     | IA                 |
| **8. Entrega**       | 1h      | Deploy + checklist | Dev                |

**Total**: 15-30 horas de trabalho humano (vs 80-160h tradicional)

---

## Mentalidade

### ✅ Vibe Coded

- "Como eu peço isso da melhor forma?"
- "O que está faltando no contexto?"
- "Isso faz sentido? Vou verificar."
- "Como itero rápido?"

### ❅ Tradicional

- "Como eu escrevo isso?"
- "Vou copiar de outro projeto."
- "Se compilou, está bom."
- "Vou pensar na documentação depois."

---

## Ferramentas Recomendadas

| Categoria        | Ferramenta           | Uso                  |
| ---------------- | -------------------- | -------------------- |
| **Orquestração** | Claude Code / Cursor | IDE nativo com IA    |
| **Geração**      | Claude Opus 4        | Código complexo      |
| **Revisão**      | Claude Sonnet 4      | Análise sistemática  |
| **Refino**       | Cursor Copilot       | Autocompletar rápido |
| **Testes**       | Claude + Dev         | Gerar + validar      |
| **Documentação** | Claude Haiku 4       | Docs consistentes    |
| **Versionar**    | Git convencional     | Controle de mudanças |

---

## Próximos Passos

1. Leia cada etapa em `docs/etapas/*.md`
2. Adapte ao seu estilo de trabalho
3. Comece com um projeto piloto pequeno
4. Refine o fluxo com base na experiência

---

**Versão**: 1.0
**Data**: 2025-03-18
