'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';

export async function logout() {
  try {
    await destroySession();
  } catch {
    console.error('[auth] failed to destroy session during logout');
    throw new Error('Falha ao encerrar sessão.');
  }

  redirect('/login');
}
