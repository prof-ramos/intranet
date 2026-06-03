import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { admins } from '@/lib/db/schema';
import { createHash } from 'node:crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('system-users');

const SYSTEM_BOT_EMAIL = 'sistema-triagem@asof.local';
const SYSTEM_BOT_NAME = 'Sistema de Triagem';

/**
 * Find or create the system bot admin user.
 *
 * The bot user is used as `createdBy` for legal notes created by the
 * correlation engine. No module-level cache — the lookup is cheap
 * (indexed by unique email) and caching risks stale IDs if the user is
 * deleted.
 */
export async function resolveSystemBotUser(): Promise<number> {
  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, SYSTEM_BOT_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(admins)
    .values({
      name: SYSTEM_BOT_NAME,
      email: SYSTEM_BOT_EMAIL,
      passwordHash: `__SYSTEM_BOT__${createHash('sha256').update(SYSTEM_BOT_EMAIL).digest('hex').slice(0, 16)}`,
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

  const raced = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, SYSTEM_BOT_EMAIL))
    .limit(1);

  if (raced.length > 0) {
    return raced[0].id;
  }

  throw new Error('Failed to create or find system bot user.');
}
