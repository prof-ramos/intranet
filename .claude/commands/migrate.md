---
description: Run database migrations
---

Fresh migration with seeding:
```bash
php artisan migrate:fresh --seed
```

Run pending migrations:
```bash
php artisan migrate
```

Rollback last migration:
```bash
php artisan migrate:rollback
```

Show migration status:
```bash
php artisan migrate:status
```
