'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { updateSession } from '@/lib/auth/session';
import { validateNewPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';

function changePasswordError(message: string): never {
  redirect(`/change-password?error=${encodeURIComponent(message)}`);
}

export async function changePassword(formData: FormData) {
  const user = await requireAuth();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    changePasswordError('Preencha todos os campos.');
  }

  if (newPassword !== confirmPassword) {
    changePasswordError('A confirmação não confere.');
  }

  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    changePasswordError(validation.message);
  }

  const admin = await db
    .select({
      id: admins.id,
      passwordHash: admins.passwordHash,
    })
    .from(admins)
    .where(eq(admins.id, user.userId))
    .get();

  if (!admin) {
    changePasswordError('Sessão inválida.');
  }

  const currentPasswordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentPasswordMatches) {
    changePasswordError('Senha atual inválida.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(admins)
    .set({
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(admins.id, user.userId))
    .run();

  await updateSession({ mustChangePassword: false });
  redirect('/app');
}
