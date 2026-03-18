# Intranet ASOF

<div align="center">

![Laravel](https://img.shields.io/badge/Laravel-11.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**Sistema administrativo para gestão de tarefas, contatos e documentos da ASOF**

*Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro*

---

[![GitHub issues](https://img.shields.io/github/issues-raw/seu-usuario/intranet)](https://github.com/seu-usuario/intranet/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/seu-usuario/intranet)](https://github.com/seu-usuario/intranet/pulls)
[![License](https://img.shields.io/github/license/seu-usuario/intranet)](LICENSE)
[![Version](https://img.shields.io/github/v/release/seu-usuario/intranet)](https://github.com/seu-usuario/intranet/releases)

</div>

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Instalação Completa](#-instalação-completa)
- [Arquitetura](#️-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Estrutura de Dados](#️-estrutura-de-dados)
- [Desenvolvimento](#-desenvolvimento)
- [Documentação](#-documentação)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)
- [Branch Protection](#️-branch-protection)
- [Licença](#-licença)

---

## 🎯 Visão Geral

A Intranet ASOF é um **painel operacional administrativo leve** focado em facilitar o dia a dia da equipe com:

- **Gestão de tarefas** com atribuição de responsáveis e prazos
- **Kanban visual** para acompanhamento do fluxo de trabalho
- **Calendário integrado** para visualização de vencimentos
- **CRM básico** para contatos institucionais
- **Métricas operacionais** para acompanhamento de produtividade

### Por que usar?

- ✅ Interface intuitiva com drag-and-drop
- ✅ Calendário integrado para prazos
- ✅ KPIs em tempo real
- ✅ Integração com Google Workspace
- ✅ Desenvolvimento otimizado com IA

---

## 📸 Screenshots

> **Nota**: Screenshots serão adicionados após a implementação do MVP.

### Dashboard

<!-- Adicionar screenshot do Dashboard aqui -->
`[Screenshot do Dashboard com Kanban e KPIs]`

### Kanban de Tarefas

<!-- Adicionar screenshot do Kanban aqui -->
`[Screenshot do Kanban com colunas e cards]`

### Calendário

<!-- Adicionar screenshot do Calendário aqui -->
`[Screenshot do Calendário com prazos]`

---

## ⚡ Quick Start

Para iniciar rapidamente em ambiente de desenvolvimento:

```bash
# Clonar e instalar
git clone https://github.com/seu-usuario/intranet.git
cd intranet
composer install && npm install

# Configurar
cp .env.example .env
php artisan key:generate

# Banco de dados (SQLite para desenvolvimento rápido)
touch database/database.sqlite
# Edite .env e defina: DB_CONNECTION=sqlite

# Migrar e popular
php artisan migrate --seed

# Iniciar
npm run dev
php artisan serve
```

Acesse `http://localhost:8000` e faça login com:
- **Email**: admin@asof.org.br
- **Senha**: password

---

## 🚀 Instalação Completa

### Requisitos

| Software | Versão | Obrigatório |
|----------|--------|-------------|
| PHP | >= 8.2 | ✅ |
| Composer | Latest | ✅ |
| MySQL | >= 8.0 | ✅ |
| PostgreSQL | >= 13 | ✅ (alternativa) |
| Node.js | >= 18 | ✅ |

### Passos Detalhados

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/intranet.git
cd intranet

# 2. Instalar dependências PHP
composer install

# 3. Instalar dependências Node.js
npm install

# 4. Configurar ambiente
cp .env.example .env
php artisan key:generate

# 5. Configurar banco de dados
# Edite o arquivo .env com suas credenciais:
```

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=intranet_asof
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
```

```bash
# 6. Executar migrations
php artisan migrate

# 7. Criar dados de exemplo (opcional)
php artisan db:seed

# 8. Build dos assets
npm run build

# 9. Iniciar servidor de desenvolvimento
php artisan serve
```

### Docker (Opcional)

```bash
# Iniciar containers
docker-compose up -d

# Executar migrations no container
docker-compose exec app php artisan migrate
```

---

## 🏗️ Arquitetura

### Stack Tecnológico

<div align="center">

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| **Backend** | ![Laravel](https://img.shields.io/badge/-11.x-FF2D20) | 11.x | Framework MVC |
| **PHP** | ![PHP](https://img.shields.io/badge/-8.2+-777BB4) | 8.2+ | Linguagem |
| **Database** | ![MySQL](https://img.shields.io/badge/-8.0+-4479A1) | 8.0+ | Banco relacional |
| **Frontend** | ![Blade](https://img.shields.io/badge/-Alpine.js-8B5CF6) | 3.x | Templates |
| **Drag & Drop** | ![SortableJS](https://img.shields.io/badge/-latest-EF4444) | latest | Kanban |
| **Calendário** | ![FullCalendar](https://img.shields.io/badge/-6.x-3B82F6) | 6.x | Agenda |
| **Auth** | ![Breeze](https://img.shields.io/badge/-Sanctum-F59E0B) | 1.x/4.x | Autenticação |
| **Google** | ![Google](https://img.shields.io/badge/-API-4285F4) | 2.15+ | Workspace |

</div>

### Decisões de Arquitetura

| Decisão | Justificativa |
|---------|---------------|
| **AdminKitPro** | Template admin profissional com componentes prontos |
| **Laravel 11** | Backend enxuto, sintaxe moderna, ecosistema maduro |
| **Google Workspace** | Repositório documental principal da organização |
| **Login por último** | Foco em funcionalidade primeiro, segurança depois |

### Padrões Utilizados

- **Repository Pattern** para acesso a dados
- **Action Classes** para lógica de negócio
- **Form Requests** para validação
- **API Resources** para serialização
- **Observers** para eventos de modelo
- **Enums** para status e prioridades

---

## 📦 Funcionalidades

### Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  KPIs: Tarefas Abertas │ Concluídas │ Atrasadas │ Taxa %   │
├─────────────────────────────────────────────────────────────┤
│  Kanban Board                    │  Calendário Semanal      │
│  ┌─────┐ ┌─────┐ ┌─────┐       │  Seg  Ter  Qua  Qui  Sex │
│  │ Todo│ │ Prog│ │ Done│       │  [3] [2] [5] [1] [4]     │
│  │ [3] │ │ [2] │ │ [5] │       │                          │
│  └─────┘ └─────┘ └─────┘       │                          │
├─────────────────────────────────────────────────────────────┤
│  Avisos Recentes  │  Links Rápidos  │  Pendências Prioritárias │
└─────────────────────────────────────────────────────────────┘
```

**Componentes**:
- Kanban administrativo com colunas por status
- Calendário de prazos (visão semanal/mensal)
- KPIs de tarefas em tempo real
- Avisos recentes
- Links rápidos para Drive/Docs/Sheets
- Pendências prioritárias

### Kanban de Tarefas

**Recursos**:
- Arrastar e soltar entre colunas
- Modal de detalhes da tarefa
- Indicadores visuais de prioridade
- Badge de responsável
- Data limite com destaque para vencidas
- Filtros por responsável, prioridade e status

**Fluxo de Status**:
```
Todo → Progress → Review → Done
              ↓
          Blocked
```

### CRM de Contatos

- Cadastro de contatos internos e institucionais
- Vinculação de contatos a tarefas
- Registro de interações
- Busca e filtros avançados

### Documentos

- Biblioteca organizada de documentos
- Links diretos para Google Drive
- Indexação por categorias
- Versionamento de documentos

### Métricas

| Métrica | Descrição |
|---------|-----------|
| Tarefas Abertas | Total de tarefas não concluídas |
| Concluídas/Semana | Tarefas finalizadas nos últimos 7 dias |
| Atrasadas | Tarefas com prazo vencido |
| Taxa de Cumprimento | % de tarefas concluídas no prazo |
| Tempo Médio | Dias médios para conclusão |
| Ranking | Desempenho por responsável |

---

## 🗄️ Estrutura de Dados

### Entidades Principais

```sql
users           → Pessoas com acesso ao sistema
contacts        → Base relacional/institucional (CRM)
tasks           → Tarefas operacionais
task_history    → Histórico de mudanças de status
notices         → Avisos e comunicados
quick_links     → Links rápidos para ferramentas
documents_index → Índice de documentos
meeting_records → Registros de reunião
```

### Status de Tarefas

| Status | Descrição | Cor |
|--------|-----------|-----|
| `todo` | A Fazer | ⚪ Cinza |
| `progress` | Em Progresso | 🔵 Azul |
| `review` | Em Revisão | 🟡 Amarelo |
| `done` | Concluído | 🟢 Verde |
| `blocked` | Bloqueado | 🔴 Vermelho |

### Prioridades

| Prioridade | Descrição | Ícone |
|------------|-----------|-------|
| `low` | Baixa | ⬇️ |
| `normal` | Normal | ➡️ |
| `high` | Alta | ⬆️ |
| `urgent` | Urgente | 🔥 |

### Relacionamentos

```
users ──────┬──── tasks (assigned_to)
            │
            ├─── contacts (created_by)
            │
            └─── task_history (changed_by)

tasks ──────┬──── contacts (via task_contacts)
            │
            ├─── task_history
            │
            └─── notices (related_task)
```

---

## 🧪 Desenvolvimento

### Estrutura de Diretórios

```
app/
├── Actions/              # Single-purpose actions
│   ├── Task/
│   ├── Contact/
│   └── Notice/
├── Contracts/            # Interfaces
├── Enums/                # PHP Enums
│   ├── TaskStatus.php
│   └── TaskPriority.php
├── Events/               # Domain events
├── Http/
│   ├── Controllers/
│   │   ├── Api/        # API endpoints
│   │   └── Web/        # Web controllers
│   ├── Middleware/
│   ├── Requests/       # FormRequest validation
│   └── Resources/      # API Resources
├── Models/
│   ├── User.php
│   ├── Task.php
│   ├── Contact.php
│   └── ...
├── Observers/
│   └── TaskObserver.php
├── Repositories/
│   └── TaskRepository.php
└── Services/
    └── MetricsService.php
```

### Comandos Úteis

```bash
# Desenvolvimento
composer dev              # Iniciar servidor + vite
composer test             # Executar testes
composer code:check       # Verificação de código
composer qa               # QA completo

# Banco de Dados
php artisan migrate:fresh --seed  # Reset com dados
php artisan tinker                 # REPL interativo

# Cache
php artisan optimize:clear        # Limpar todos os caches
php artisan config:cache          # Cache de configuração
```

### Executar Testes

```bash
# Todos os testes
pest

# Com cobertura
pest --coverage

# Parallel
pest --parallel

# Teste específico
pest --filter=TaskTest
```

### Code Style

```bash
# Verificar estilo
./vendor/bin/pint --test

# Corrigir estilo
./vendor/bin/pint
```

---

## 📚 Documentação

### Documentos Principais

| Documento | Descrição |
|-----------|-----------|
| **[Plan.md](Plan.md)** | Planejamento técnico completo |
| **[docs/setup-ai-workflow.md](docs/setup-ai-workflow.md)** | Configuração do ambiente de IA |
| **[docs/etapas/README.md](docs/etapas/README.md)** | Processo Vibe Coded |
| **[docs/api/](docs/api/)** | API Documentation |

### Workflow de IA

O projeto está configurado com ferramentas de IA para otimizar o desenvolvimento:

| Ferramenta | Localização | Descrição |
|------------|-------------|-----------|
| 📝 Prompts | `.claude/prompts/` | Templates para Models, Controllers e Testes |
| 🔧 Hooks | `.claude/hooks/` | Validação automática de commits |
| 📋 Docs | `docs/` | PRD e documentação de API |
| ⚡ Scripts | `composer.json` | Comandos de teste e QA |

---

## 🔧 Troubleshooting

### Problemas Comuns

#### Erro: `APP_KEY não definido`

```bash
php artisan key:generate
```

#### Erro: `Connection refused` no banco

Verifique se o banco está rodando e as credenciais no `.env`:
```bash
# Testar conexão
php artisan tinker
>>> DB::connection()->getPdo();
```

#### Erro: `Class not found` após instalação

```bash
composer dump-autoload
```

#### Assets não carregam

```bash
npm run build
# ou para desenvolvimento:
npm run dev
```

#### Permissões de storage

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### Migration falha

```bash
# Reset migrations
php artisan migrate:fresh

# Ver status das migrations
php artisan migrate:status
```

### Logs

```bash
# Ver logs em tempo real
tail -f storage/logs/laravel.log

# Últimas 100 linhas
tail -n 100 storage/logs/laravel.log
```

### Debug Mode

Para desenvolvimento, ative o debug no `.env`:
```env
APP_DEBUG=true
```

**⚠️ Nunca ative em produção!**

---

## 🔄 Roadmap

### Versão 1 (MVP — Em Progresso)

- [x] Planejamento técnico
- [x] Setup do projeto
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
- [ ] API REST completa
- [ ] Mobile App (React Native)

---

## 🤝 Contribuindo

Este projeto segue o fluxo **[Vibe Coded](docs/etapas/README.md)** — desenvolvimento otimizado para IA.

### Como Contribuir

1. **Fork** o projeto
2. **Clone** seu fork
   ```bash
   git clone https://github.com/seu-usuario/intranet.git
   ```
3. **Crie branch** para sua feature
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```
4. **Commit** suas mudanças
   ```bash
   git commit -m 'feat: add nova funcionalidade'
   ```
5. **Push** para branch
   ```bash
   git push origin feature/nova-funcionalidade
   ```
6. **Abra Pull Request**

### Convenções de Commit

| Tipo | Uso | Exemplo |
|------|-----|---------|
| `feat` | Nova funcionalidade | `feat(kanban): adiciona drag and drop` |
| `fix` | Correção de bug | `fix(calendario): corrige fuso horario` |
| `refactor` | Refatoração | `refactor(tarefas): extrai repositorio` |
| `docs` | Documentação | `docs(readme): atualiza instrucoes` |
| `test` | Testes | `test(tarefas): adiciona testes unitarios` |
| `chore` | Manutenção | `chore(deps): atualiza dependencias` |

---

## 🛡️ Branch Protection

O branch `main` é protegido com as seguintes regras:

### Requisitos antes do Merge

| Regra | Status | Descrição |
|-------|--------|-----------|
| `commitlint` | ✅ | Validação de formato de commit |
| `tests` | ✅ | Testes Pest devem passar |
| `code:check` | ✅ | Formatação Pint deve passar |
| PR Review | ✅ | 1 aprovação necessária |
| Branch atualizado | ✅ | Branch deve estar up-to-date |

### Como Configurar

1. Vá em **Settings > Branches**
2. Clique em **Add rule** para `main`
3. Marque as opções:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
4. Adicione os status checks:
   - `commitlint`
   - `tests`
   - `code:check`

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👥 Equipe

| Função | Responsável |
|--------|-------------|
| **Desenvolvimento** | Equipe técnica ASOF |
| **Product Owner** | ASOF |
| **Design** | AdminKitPro |

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/intranet/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/intranet/discussions)
- **Email**: suporte@asof.org.br

---

<div align="center">

**Desenvolvido com ❤️ pela ASOF**

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=flat-square&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)
![Alpine.js](https://img.shields.io/badge/Alpine.js-8B5CF6?style=flat-square&logo=alpinedotjs&logoColor=white)

**Versão**: 2.2 | **Atualizado**: 2025-03-18 | **Laravel**: 11.x

</div>
