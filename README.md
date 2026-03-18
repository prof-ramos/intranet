# Intranet ASOF

> **Versão**: 2.2 | **Status**: Planejamento | **Atualizado**: 2025-03-18

Sistema administrativo para gestão de tarefas, contatos e documentos da ASOF — Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro.

---

## 🎯 Visão Geral

A Intranet ASOF é um **painel operacional administrativo leve** focado em facilitar o dia a dia da equipe com:

- **Gestão de tarefas** com atribuição de responsáveis e prazos
- **Kanban visual** para acompanhamento do fluxo de trabalho
- **Calendário integrado** para visualização de vencimentos
- **CRM básico** para contatos institucionais
- **Métricas operacionais** para acompanhamento de produtividade

---

## 🏗️ Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Backend** | Laravel | 11.x |
| **PHP** | PHP | 8.2+ |
| **Database** | MySQL / PostgreSQL | 8.0+ / 13+ |
| **Frontend** | Blade + Alpine.js | 3.x |
| **Drag & Drop** | SortableJS | latest |
| **Calendário** | FullCalendar | 6.x |
| **Autenticação** | Laravel Breeze | 1.x |
| **API Tokens** | Laravel Sanctum | 4.x |
| **Google API** | google/apiclient | 2.15+ |

### Decisões de Arquitetura

- **AdminKitPro** (ou equivalente) como camada visual
- **Laravel 11** como backend enxuto
- **Google Workspace** como repositório documental principal
- **Login por último** — restringir área administrativa apenas quando necessário

---

## 📦 Funcionalidades (Versão 1)

### Dashboard

- Kanban administrativo com colunas por status
- Calendário de prazos (visão semanal/mensal)
- KPIs de tarefas em tempo real
- Avisos recentes
- Links rápidos para Drive/Docs/Sheets
- Pendências prioritárias

### Kanban de Tarefas

- Arrastar e soltar entre colunas
- Modal de detalhes da tarefa
- Indicadores visuais de prioridade
- Badge de responsável
- Data limite com destaque para vencidas
- Filtros por responsável, prioridade e status

### CRM de Contatos

- Cadastro de contatos internos e institucionais
- Vinculação de contatos a tarefas
- Registro de interações

### Documentos

- Biblioteca organizada de documentos
- Links diretos para Google Drive
- Indexação por categorias

### Métricas

- Total de tarefas abertas
- Total de tarefas concluídas na semana
- Total de tarefas atrasadas
- Taxa de cumprimento de prazo (%)
- Tempo médio de conclusão (dias)
- Ranking por responsável

---

## 🗄️ Estrutura de Dados

### Entidades Principais

```
users       → Pessoas com acesso ao sistema
contacts    → Base relacional/institucional (CRM)
tasks       → Tarefas operacionais
task_history→ Histórico de mudanças de status
notices     → Avisos e comunicados
quick_links → Links rápidos para ferramentas
documents_index → Índice de documentos
meeting_records → Registros de reunião
```

### Status de Tarefas

```
todo       → A Fazer
progress   → Em Progresso
review     → Em Revisão
done       → Concluído
blocked    → Bloqueado
```

### Prioridades

```
low        → Baixa
normal     → Normal
high       → Alta
urgent     → Urgente
```

---

## 🚀 Instalação

### Requisitos

- PHP >= 8.2
- Composer
- MySQL >= 8.0 ou PostgreSQL >= 13
- Node.js >= 18 (para assets)

### Passos

```bash
# Clonar repositório
git clone https://github.com/.../intranet.git
cd intranet

# Instalar dependências
composer install
npm install

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Configurar banco no .env
# DB_DATABASE=intranet_asof
# DB_USERNAME=seu_usuario
# DB_PASSWORD=sua_senha

# Executar migrations
php artisan migrate

# Criar dados de exemplo (opcional)
php artisan db:seed

# Build assets
npm run build

# Executar servidor
php artisan serve
```

Acesse `http://localhost:8000`

---

## 📚 Documentação

- **[Planejamento Completo](Plan.md)** — Documento técnico detalhado
- **[Guia Vibe Coded](docs/etapas/README.md)** — Processo de desenvolvimento com IA
- **[API Documentation](docs/api/)** — Endpoints e contratos (quando disponível)

---

## 🧪 Desenvolvimento

### Estrutura de Diretórios

```
app/
├── Actions/              # Single-purpose actions
├── Contracts/            # Interfaces
├── Enums/                # PHP Enums (TaskStatus, TaskPriority)
├── Events/               # Domain events
├── Http/
│   ├── Controllers/      # API e Web controllers
│   ├── Middleware/       # Middleware customizado
│   ├── Requests/         # FormRequest validation
│   └── Resources/        # API Resources
├── Models/               # Eloquent models
├── Observers/            # Model observers
├── Repositories/         # Data access layer
└── Services/             # Business logic
```

### Executar Testes

```bash
# Todos os testes
pest

# Com cobertura
pest --coverage

# Parallel
pest --parallel
```

---

## 🔄 Roadmap

### Versão 1 (MVP — Planejado)

- [x] Planejamento técnico
- [ ] Setup do projeto
- [ ] Dashboard com KPIs
- [ ] Kanban de tarefas
- [ ] Calendário de prazos
- [ ] CRUD de tarefas
- [ ] Contatos básicos
- [ ] Avisos e links
- [ ] Métricas básicas

### Versão 2 (Evolução)

- [ ] Autenticação com OAuth Google
- [ ] Integração avançada com Google Workspace
- [ ] Upload de arquivos
- [ ] Notificações por email
- [ ] Relatórios avançados

---

## 🤝 Contribuindo

Este projeto segue o fluxo **[Vibe Coded](docs/etapas/README.md)** — desenvolvimento otimizado para IA.

1. Fork o projeto
2. Crie branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: add nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

---

## 📄 Licença

MIT

---

## 👥 Equipe

- **Desenvolvimento**: Equipe técnica ASOF

---

**Versão**: 2.2
**Atualizado em**: 2025-03-18
**Alinhado com**: Laravel 11, PHP 8.2+, FullCalendar 6
