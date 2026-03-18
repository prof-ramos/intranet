# Template de Documentação de API

## Instruções

Use este template para documentar endpoints da API do projeto Intranet ASOF.

## Estrutura de Documentação

```markdown
# [Nome do Endpoint/Recurso]

## Visão Geral
- **Método**: GET/POST/PUT/PATCH/DELETE
- **URL**: `/api/resource`
- **Descrição**: Breve descrição do endpoint
- **Versão**: 1.0
- **Autenticação**: [Obrigatória/Opcional/Nenhuma]
- **Rate Limiting**: [X requisições por minuto]

## Parâmetros de Request

### Headers
| Header | Valor | Descrição | Obrigatório |
|--------|-------|-------------|--------------|
| Content-Type | application/json | Tipo de conteúdo | Sim |
| Accept | application/json | Tipo de resposta esperado | Sim |
| Authorization | Bearer {token} | Token de autenticação | Sim |

### Query Parameters (se aplicável)
| Parâmetro | Tipo | Descrição | Obrigatório | Padrão |
|-----------|------|-------------|--------------|---------|
| page | integer | Página atual | Não | 1 |
| per_page | integer | Itens por página | Não | 15 |
| sort | string | Campo de ordenação | Não | created_at |
| direction | string | Direção da ordenação (asc/desc) | Não | desc |

### Body Parameters (se aplicável)
| Campo | Tipo | Descrição | Obrigatório | Validações |
|-------|------|-------------|--------------|-----------|
| title | string | Título do recurso | Sim | máx:255 |
| description | text | Descrição detalhada | Não | nullable |
| status | string | Status do recurso | Sim | in:pending,in_progress,completed |
| priority | string | Prioridade | Sim | in:low,medium,high |

## Exemplo de Request

### cURL

```bash
curl -X POST https://api.intranet.asof.com/api/tasks \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Nova tarefa",
    "description": "Descrição da tarefa",
    "status": "pending",
    "priority": "medium"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://api.intranet.asof.com/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Nova tarefa',
    description: 'Descrição da tarefa',
    status: 'pending',
    priority: 'medium'
  })
});

const data = await response.json();
```

### PHP (Laravel HTTP Client)

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken($token)
    ->acceptJson()
    ->post('https://api.intranet.asof.com/api/tasks', [
        'title' => 'Nova tarefa',
        'description' => 'Descrição da tarefa',
        'status' => 'pending',
        'priority' => 'medium',
    ]);

$data = $response->json();
```

## Respostas

### Resposta de Sucesso

**Status Code**: 201 Created

```json
{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": {
    "id": 123,
    "title": "Nova tarefa",
    "description": "Descrição da tarefa",
    "status": "pending",
    "priority": "medium",
    "user_id": 1,
    "created_at": "2026-03-18T12:00:00.000000Z",
    "updated_at": "2026-03-18T12:00:00.000000Z"
  }
}
```

### Resposta de Erro - Validação

**Status Code**: 422 Unprocessable Entity

```json
{
  "success": false,
  "message": "Os dados fornecidos são inválidos",
  "errors": {
    "title": [
      "O campo title é obrigatório.",
      "O campo title não pode ter mais de 255 caracteres."
    ],
    "status": [
      "O valor selecionado para status é inválido."
    ]
  }
}
```

### Resposta de Erro - Não Autorizado

**Status Code**: 401 Unauthorized

```json
{
  "success": false,
  "message": "Não autenticado",
  "errors": {
    "auth": [
      "Token de autenticação inválido ou expirado."
    ]
  }
}
```

### Resposta de Erro - Proibido

**Status Code**: 403 Forbidden

```json
{
  "success": false,
  "message": "Você não tem permissão para acessar este recurso",
  "errors": {
    "authorization": [
      "Acesso negado."
    ]
  }
}
```

### Resposta de Erro - Não Encontrado

**Status Code**: 404 Not Found

```json
{
  "success": false,
  "message": "Recurso não encontrado",
  "errors": {
    "resource": [
      "A tarefa solicitada não existe ou foi removida."
    ]
  }
}
```

### Resposta de Erro - Servidor

**Status Code**: 500 Internal Server Error

```json
{
  "success": false,
  "message": "Erro interno do servidor",
  "errors": {
    "server": [
      "Ocorreu um erro ao processar sua solicitação."
    ]
  }
}
```

## Resposta Paginada

Para endpoints que retornam listas, use o formato de resposta paginada:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Tarefa 1",
      "status": "pending",
      "priority": "high"
    },
    {
      "id": 2,
      "title": "Tarefa 2",
      "status": "completed",
      "priority": "medium"
    }
  ],
  "links": {
    "first": "https://api.intranet.asof.com/api/tasks?page=1",
    "last": "https://api.intranet.asof.com/api/tasks?page=10",
    "prev": null,
    "next": "https://api.intranet.asof.com/api/tasks?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 10,
    "path": "https://api.intranet.asof.com/api/tasks",
    "per_page": 15,
    "to": 15,
    "total": 150
  }
}
```

## Status Codes

| Código | Significado | Descrição |
|--------|-------------|-------------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 204 | No Content | Requisição bem-sucedida sem conteúdo de resposta |
| 400 | Bad Request | Requisição malformada |
| 401 | Unauthorized | Falha na autenticação |
| 403 | Forbidden | Sem permissão para acessar recurso |
| 404 | Not Found | Recurso não encontrado |
| 422 | Unprocessable Entity | Erro de validação |
| 429 | Too Many Requests | Limite de requisições excedido |
| 500 | Internal Server Error | Erro interno do servidor |

## Exemplos de Cenários

### Cenário 1: Listar Tarefas com Filtros

**Request**:
```bash
GET /api/tasks?status=pending&priority=high&sort=created_at&direction=desc&page=1
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "title": "Tarefa urgente",
      "status": "pending",
      "priority": "high",
      "created_at": "2026-03-18T10:00:00.000000Z"
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

### Cenário 2: Atualizar Tarefa Parcialmente (PATCH)

**Request**:
```bash
PATCH /api/tasks/456
{
  "status": "in_progress"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Tarefa atualizada com sucesso",
  "data": {
    "id": 456,
    "title": "Tarefa urgente",
    "status": "in_progress",
    "priority": "high",
    "updated_at": "2026-03-18T12:30:00.000000Z"
  }
}
```

### Cenário 3: Deletar Tarefa

**Request**:
```bash
DELETE /api/tasks/456
```

**Response**:
```json
{
  "success": true,
  "message": "Tarefa removida com sucesso"
}
```

**Status Code**: 204 No Content

## Considerações Importantes

### Validação
- Todos os campos são validados no servidor
- Retornar erro 422 com detalhes dos campos inválidos
- Use as mensagens de erro exatas fornecidas pela API

### Autenticação
- Use Bearer Token no header Authorization
- O token deve ser obtido via endpoint de login
- Tokens expiram e precisam ser renovados

### Rate Limiting
- Respeite os limites de requisições por minuto
- Erro 429 indica limite excedido
- Aguarde antes de tentar novamente

### Formatação de Datas
- Todas as datas seguem formato ISO 8601
- Timezone UTC
- Exemplo: 2026-03-18T12:00:00.000000Z

### Paginação
- Use os links fornecidos em `links` para navegação
- Não construa URLs manualmente
- Verifique `meta.total` para saber quantidade total de itens

## Testando a API

### Usando Postman
1. Importe a collection da API
2. Configure o base URL
3. Adicione token de autenticação em environment variables
4. Execute os requests na ordem: Login → Listar → Criar → Atualizar → Deletar

### Usando cURL
```bash
# 1. Login e obter token
TOKEN=$(curl -X POST https://api.intranet.asof.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.token')

# 2. Usar token em requests subsequentes
curl -X GET https://api.intranet.asof.com/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Usando Insomnia
1. Crie environment para desenvolvimento
2. Adicione variáveis: `base_url`, `token`
3. Use `{{base_url}}` nas URLs
4. Use `{{token}}` no header Authorization

## Checklist de Validação

Ao documentar um endpoint, verifique:

- [ ] Método HTTP correto especificado
- [ ] URL completa e precisa
- [ ] Todos os parâmetros documentados
- [ ] Exemplos de request incluídos
- [ ] Exemplos de response incluídos
- [ ] Códigos de status documentados
- [ ] Cenários de erro cobertos
- [ ] Validações descritas
- [ ] Autenticação documentada
- [ ] Exemplos em múltiplas linguagens

## Exemplo Completo: Endpoint de Listar Tarefas

```markdown
# Listar Tarefas

## Visão Geral
- **Método**: GET
- **URL**: `/api/tasks`
- **Descrição**: Lista todas as tarefas do usuário autenticado
- **Versão**: 1.0
- **Autenticação**: Obrigatória
- **Rate Limiting**: 60 requisições por minuto

## Parâmetros de Request

### Headers
| Header | Valor | Descrição | Obrigatório |
|--------|-------|-------------|--------------|
| Content-Type | application/json | Tipo de conteúdo | Sim |
| Accept | application/json | Tipo de resposta esperado | Sim |
| Authorization | Bearer {token} | Token de autenticação | Sim |

### Query Parameters
| Parâmetro | Tipo | Descrição | Obrigatório | Padrão |
|-----------|------|-------------|--------------|---------|
| page | integer | Página atual | Não | 1 |
| per_page | integer | Itens por página (max 100) | Não | 15 |
| status | string | Filtrar por status | Não | - |
| priority | string | Filtrar por prioridade | Não | - |
| sort | string | Campo de ordenação | Não | created_at |
| direction | string | Direção da ordenação (asc/desc) | Não | desc |

## Exemplo de Request

### cURL
```bash
curl -X GET 'https://api.intranet.asof.com/api/tasks?status=pending&page=1&per_page=10' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {token}'
```

## Resposta de Sucesso

**Status Code**: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Tarefa 1",
      "description": "Descrição da tarefa 1",
      "status": "pending",
      "priority": "high",
      "created_at": "2026-03-18T12:00:00.000000Z",
      "updated_at": "2026-03-18T12:00:00.000000Z"
    },
    {
      "id": 2,
      "title": "Tarefa 2",
      "description": "Descrição da tarefa 2",
      "status": "pending",
      "priority": "medium",
      "created_at": "2026-03-18T11:00:00.000000Z",
      "updated_at": "2026-03-18T11:00:00.000000Z"
    }
  ],
  "links": {
    "first": "https://api.intranet.asof.com/api/tasks?page=1",
    "last": "https://api.intranet.asof.com/api/tasks?page=5",
    "prev": null,
    "next": "https://api.intranet.asof.com/api/tasks?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "per_page": 10,
    "to": 10,
    "total": 45
  }
}
```

## Valores Possíveis para Filtros

### Status
- `pending` - Pendente
- `in_progress` - Em progresso
- `completed` - Concluída

### Prioridade
- `low` - Baixa
- `medium` - Média
- `high` - Alta

### Ordenação
- `created_at` - Data de criação
- `updated_at` - Data de atualização
- `title` - Título
- `priority` - Prioridade