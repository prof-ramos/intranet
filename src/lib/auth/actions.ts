'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';
import { toSafeErrorLog } from '@/lib/error-log';

export async function logout() {
  try {
    await destroySession();
  } catch (error) {
    console.error('[auth] failed to destroy session during logout', {
      error: toSafeErrorLog(error),
    });
    throw new Error('Falha ao encerrar sessão.');
  }

  redirect('/login');
}
