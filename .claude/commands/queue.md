---
description: Run queue worker
---

Start queue worker:
```bash
php artisan queue:work
```

Queue worker with timeout (useful for long jobs):
```bash
php artisan queue:work --timeout=300
```

Listen in background (development):
```bash
php artisan queue:listen
```

Retry failed jobs:
```bash
php artisan queue:retry all
```
