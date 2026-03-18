# Etapa 4 — Revisão Sistemática

> **Tempo estimado**: 2-4 horas
> **Saída**: Código validado, issues documentados

---

## Filosofia

> **"Confie, mas verifique."**

Código gerado por IA é 80-90% correto. Os 10-20% restantes são bugs sutis, segurança, performance.

---

## 1. Revisão Automática (IA)

### Prompt de Revisão Global

```
/claude "Faça uma revisão completa do codebase.

Foque em:
1. BUGS: Lógica incorreta, casos não tratados
2. SEGURANÇA: SQL injection, XSS, auth bypass
3. PERFORMANCE: N+1 queries, loops ineficientes
4. CODE SMELL: Duplicação, nomes confusos
5. LARAVEL: Uso incorreto de features

Para cada issue:
- Arquivo:linha
- Severidade (crítico/alto/médio/baixo)
- Descrição clara
- Sugestão de correção"
```

### Revisão por Camada

#### Models

```
/claude "Revise Models:

1. Falta de casts apropriados
2. Relacionamentos sem return type
3. Scopes que poderiam ser queries compostas
4. Atributos em fillable que deveriam ser guarded
5. Falta de eager loading antecipado"
```

#### Controllers

```
/claude "Revise Controllers:

1. Lógica de negócio no controller (deveria estar em Service)
2. Falta de validation (FormRequest)
3. Retornos inconsistentes
4. Exceções não tratadas
5. Responsabilidade única violada"
```

#### Migrations

```
/claude "Revise Migrations:

1. Foreign keys sem onDelete
2. Falta de indexes em colunas de busca
3. Tipos inadequados (string ao invés de enum, etc)
4. Tabelas sem timestamps
5. Ordem incorreta (dependências)"
```

---

## 2. Checklist de Segurança

### Laravel Security

```php
// ✅ CORRETO
class TaskController extends Controller
{
    public function store(StoreTaskRequest $request)  // Validation
    {
        $task = auth()->user()->tasks()->create($request->validated());  // Authorization
        return new TaskResource($task);
    }
}

// ❅ INCORRETO
public function store(Request $request)
{
    $task = Task::create($request->all());  // Mass assignment vulnerability!
    return $task;
}
```

### Checklist

- [ ] Todo input validado (FormRequest)
- [ ] Authorization verificada (policies/gates)
- [ ] SQL injection evitado (Eloquent/param binding)
- [ ] XSS evitado (Blade auto-escape)
- [ ] CSRF tokens habilitados
- [ ] Sensitive data em .env (não hardcoded)
- [ ] Passwords hashed (nunca plain text)
- [ ] File uploads validados (tipo, tamanho)

---

## 3. Performance Check

### N+1 Query Detector

```
/claude "Identifique possíveis N+1 queries:

1. Relacionamentos acessados em loops
2. Falta de with() eager loading
3. Queries dentro de foreach

Sugira correções com eager loading."
```

### Exemplo

```php
// ❅ N+1 Problem
$tasks = Task::all();
foreach ($tasks as $task) {
    echo $task->assignedTo->name;  // Query a cada iteração!
}

// ✅ Corrigido
$tasks = Task::with('assignedTo')->get();
foreach ($tasks as $task) {
    echo $task->assignedTo->name;  // Já carregado!
}
```

### Ferramentas

```bash
# Laravel Debugbar
composer require barryvdh/laravel-debugbar --dev

# Clockwork (alternativa)
composer require itsgoingd/clockwork --dev

# Telescope (production-ready em local)
composer require laravel/telescope --dev
```

---

## 4. Code Review Manual

### O Que Procurar

| Categoria | O Que Verificar |
|-----------|-----------------|
| **Nomenclatura** | Nomes significativos, consistentes em pt_BR ou en_US |
| **Tipos** | Type hints em todos os métodos, return types |
| **Complexidade** | Métodos < 20 linhas, classes < 300 linhas |
| **DRY** | Sem duplicação, usar traits/services se preciso |
| **SLA** | Single Level of Abstraction — misturar baixo e alto nível |
| **Magia** | Evitar @, métodos mágicos, eval |

### Exemplo: Refatoração Necessária

```php
// ❅ Muitas responsabilidades
public function store(Request $request)
{
    // Validação
    // Criar tarefa
    // Enviar email
    // Atualizar métricas
    // Loggar atividade
    // Notificar Slack
}

// ✅ Delegado
public function store(StoreTaskRequest $request)
{
    $task = $this->service->createTask($request);
    return new TaskResource($task);
}

// Service cuida do resto
```

---

## 5. Testes de Sanidade

### Testes Manuais Rápidos

```bash
# 1. Criar registro
curl -X POST http://localhost/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Teste","status":"todo","deadline":"2025-12-31"}'

# 2. Listar
curl http://localhost/api/tasks

# 3. Buscar um
curl http://localhost/api/tasks/1

# 4. Atualizar
curl -X PATCH http://localhost/api/tasks/1 \
  -d '{"status":"done"}'

# 5. Deletar
curl -X DELETE http://localhost/api/tasks/1
```

### Teste de Carga (Básico)

```bash
# Instalar ab (Apache Bench)
ab -n 100 -c 10 http://localhost/api/tasks

# Saída esperada:
# - 0 failed requests
# - Time per request < 500ms (para API simples)
```

---

## 6. Documentação de Issues

### Template

```markdown
# Issues Encontrados — Revisão [Data]

## Críticos (bloqueiam lançamento)
- [ ] #1 [AUTH] TasksController sem authorization
- [ ] #2 [SQL] UserInputController com SQL injection

## Altos (devem ser corrigidos)
- [ ] #3 [PERF] TaskController N+1 em index()
- [ ] #4 [CODE] TaskService com 200 linhas

## Médios (melhorias)
- [ ] #5 [STYLE] Nomes inconsistentes (pt_BR/en_US misto)
- [ ] #6 [DOCS] Falta docblock em TaskRepository

## Baixos (nice to have)
- [ ] #7 [CLEAN] Comentários obsoletos
```

### Prompt para Gerar Lista

```
/claude "Após a revisão, liste TODOS os issues encontrados.

Formato:
## [SEVERIDADE] #X [TIPO] Título
**Arquivo**: caminho/arquivo.php:linha
**Problema**: Descrição
**Correção**: Sugestão

Severidades: CRÍTICO, ALTO, MÉDIO, BAIXO
Tipos: AUTH, SQL, PERF, CODE, STYLE, DOCS"
```

---

## 7. Refatoração Guiada

### Processo

```
1. IA identifica issue
2. Você confirma: "Sim, corrija"
3. IA gera correção
4. Você aplica e testa
5. Commit: "fix: resolve #X - descrição"
```

### Prompt de Correção

```
/claude "Corrija o issue #X:

[COPIAR ISSUE DA LISTA]

Gere:
1. Código corrigido (completo)
2. Explicação do que mudou
3. Como validar que funciona"
```

---

## 8. Métricas de Qualidade

### PHPStan / Psalm

```bash
# PHPStan
composer require --dev phpstan/phpstan
./vendor/bin/phpstan analyse app --level=8

# Psalm
composer require --dev vimeo/psalm
./vendor/bin/psalm --init
./vendor/bin/psalm
```

### Pint (Formatação)

```bash
# Laravel Pint
composer require --dev laravel/pint
./vendor/bin/pint --test

# Auto-corrigir
./vendor/bin/pint
```

### Larastan

```bash
# Larastan (wrapper PHPStan para Laravel)
composer require --dev nunomaduro/larastan
./vendor/bin/phpstan analyse
```

---

## 9. Revisão de Frontend

### Alpine.js

```
/claude "Revise código Alpine:

1. Variáveis não reativas que deveriam ser
2. Falta de $nextTick para atualizações DOM
3. Event emitters sem listener correspondente
4. Memória leaks (listeners não removidos)
5. SEO/Accessibility (x-data sem x-cloak)"
```

### Blade

```
/claude "Revise views Blade:

1. {{ }} escapando quando deveria ser {!! !!}
2. @foreach sem @forelse (tratamento vazio)
3. Directives repetidas (pode ser component)
4. CSS inline (deveria estar em classe)
5. IDs duplicados em loops"
```

---

## Checklist Final

- [ ] Revisão IA executada
- [ ] Issues documentados
- [ ] Críticos corrigidos
- [ ] Altos prioridade corrigidos
- [ ] Testes manuais passando
- [ ] Pint sem erros
- [ ] PHPStan nível 5+ passando
- [ ] N+1 queries identificados e corrigidos
- [ ] Security checklist OK

---

## Saída Esperada

- [ ] `docs/review/issues-[data].md`
- [ ] Issues críticos resolvidos
- [ ] Commits de correção aplicados
- [ ] Código estável para próxima fase

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [06-refino.md](./06-refino.md)
