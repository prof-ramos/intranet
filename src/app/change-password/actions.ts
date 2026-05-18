'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { validateNewPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { firstZodError } from '@/lib/server-actions/utils';
import { changePasswordSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:change-password');

function changePasswordError(message: string): never {
  redirect(`/change-password?error=${encodeURIComponent(message)}`);
}

export async function changePassword(formData: FormData) {
  const user = await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    changePasswordError(firstZodError(parsed.error.issues));
  }

  const { currentPassword, newPassword } = parsed.data;

  const validation = validateNewPassword(newPassword);
  if (!validation.valid) {
    changePasswordError(validation.message);
  }

  if (!user.email) {
    changePasswordError('Sessão inválida.');
  }

  const [admin] = await db
    .select({
      id: admins.id,
      passwordHash: admins.passwordHash,
    })
    .from(admins)
    .where(eq(admins.id, user.userId))
    .limit(1);

  if (!admin) {
    changePasswordError('Sessão inválida.');
  }

  const currentPasswordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentPasswordMatches) {
    changePasswordError('Senha atual inválida.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const supabase = await createServerSupabaseClient();
  const { error: updateAuthError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateAuthError) {
    changePasswordError('Não foi possível atualizar a senha no provedor de autenticação.');
  }

  try {
    await db
      .update(admins)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: sql`now()`,
      })
      .where(eq(admins.id, user.userId));
  } catch (error) {
    const { error: rollbackError } = await supabase.auth.updateUser({
      password: currentPassword,
    });

    if (rollbackError) {
      logger.error('[change-password] failed to rollback auth password after DB write failure', {
        error: toSafeErrorLog(rollbackError),
      }, rollbackError as Error);
    }

    logger.error('[change-password] failed to persist new password hash', {
      error: toSafeErrorLog(error),
    }, error as Error);
    changePasswordError('Não foi possível concluir a alteração de senha.');
  }

  redirect('/app');
}
