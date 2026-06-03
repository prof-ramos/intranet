import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { admins } from '@/lib/db/schema';
import { createHash } from 'node:crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('system-users');

/**
 * Find or create the system bot admin user ('Sistema de Triagem').
 *
 * The bot user is used as `createdBy` for legal notes created by the
 * correlation engine. No module-level cache — the lookup is cheap
 * (indexed by name) and caching risks stale IDs if the user is deleted.
 */
export async function resolveSystemBotUser(): Promise<number> {
  const systemBot = await db
    .select()
    .from(admins)
    .where(eq(admins.name, 'Sistema de Triagem'))
    .limit(1);

  if (systemBot.length > 0) {
    return systemBot[0].id;
  }

  const [created] = await db
    .insert(admins)
    .values({
      name: 'Sistema de Triagem',
      email: 'sistema-triagem@asof.local',
      passwordHash: `__SYSTEM_BOT__${createHash('sha256').update('sistema-triagem@asof.local').digest('hex').slice(0, 16)}`,
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    })
    .onConflictDoNothing()
    .returning({ id: admins.id });

  if (created) {
    log.info('Created system bot user for triage.', { userId: created.id });
    return created.id;
  }

  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, 'sistema-triagem@asof.local'))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  throw new Error('Failed to create or find system bot user.');
}
