'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';
import { toSafeErrorLog, ensureError } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth');

export async function logout() {
  try {
    await destroySession();
  } catch (error) {
    logger.error(
      '[auth] failed to destroy session during logout',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
    throw new Error('Falha ao encerrar sessão.');
  }

  redirect('/login');
}
