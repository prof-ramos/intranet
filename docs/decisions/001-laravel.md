# ADR 001 — Por que Laravel 11?

## Status

Aceito | 2025-03-18

---

## Contexto

Precisamos de um framework PHP backend para um painel administrativo (intranet) com:
- Autenticação de usuários
- CRUD de entidades (tarefas, contatos)
- APIs REST para frontend
- Integração futura com Google Workspace
- Equipe familiarizada com PHP

---

## Decisão

Usar **Laravel 11.x** como framework principal.

---

## Justificativa

### Positivos

| Fator | Por que Laravel |
|-------|-----------------|
| **Ecossistema maduro** | Pacotes para tudo (Breeze, Sanctum, Telescope) |
| **Autenticação rápida** | Laravel Breeze: scaffolding completo em minutos |
| **ORM poderoso** | Eloquent com relacionamentos, observers, casting |
| **Integração Google** | Pacote `google/apiclient` bem suportado |
| **Comunidade** | Maior comunidade PHP, tutoriais abundantes |
| **LTS até 2027** | Laravel 11 terá suporte de longo prazo |
| **PHP 8.2+ features** | Enums, Attributes, readonly properties nativos |

### Casos de Uso Específicos

- **Observers com PHP 8 Attributes**: Registro automático, sem provider manual
- **Enum Casting`: TaskStatus/TaskPriority como typed enums
- **Query Scopes**: `Task::overdue()->get()` sintaxe fluente
- **API Resources**: Transformação padronizada para JSON
- **Soft Deletes**: `withTrashed()` para recuperação

---

## Consequências

### Positivas

- Desenvolvimento 2-3x mais rápido que raw PHP
- Padrões consistentes (MVC, Services, Repositories)
- Testes integrados com Pest
- Documentação oficial excelente
- Facilidade de contratação (devs conhecem Laravel)

### Negativas

- Curva de aprendizado para equipe sem experiência Laravel
- "Opiniated": convenções sobre configuração (pode limitar flexibilidade)
- Overhead para projetos muito pequenos (não é o caso)
- Atualizações de versão maior exigem mudanças

---

## Alternativas Consideradas

### Symfony

- **Mais flexível**, mas mais complexo
- Curva de aprendizado mais íngreme
- Overkill para intranet simples

### Slim 4

- Microframework leve
- Teríamos que construir tudo (auth, ORM, validation)
- Economia de tempo nula no longo prazo

### CodeIgniter 4

- Menos popular no Brasil
- Ecossistema menor
- Recursos menos modernos

---

## Referências

- [Laravel 11 Documentation](https://laravel.com/docs/11.x)
- [Laravel Breeze](https://laravel.com/docs/11.x/starter-kits)
- [PHP 8.2 Features](https://www.php.net/releases/8.2/pt_BR.php)

---

**Decidido por**: Equipe Técnica ASOF
**Revisão**: V1 — Decisão inicial
