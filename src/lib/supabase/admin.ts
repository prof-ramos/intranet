import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config';
import { getNodeRealtimeOptions } from '@/lib/supabase/node-ws';
import { env } from '@/lib/env';
import type { AuthRole } from '@/lib/auth/config';
import { logAuditAction } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';

interface EnsureAdminAuthUserInput {
  email: string;
  password?: string;
  name: string;
  role: AuthRole;
  mustChangePassword: boolean;
  resetPassword?: boolean;
}

const logger = createLogger('supabase:admin');

let adminClient: ReturnType<typeof createClient> | null = null;

function _getSupabaseAdminClient() {
  adminClient ??= createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: getNodeRealtimeOptions(),
  });

  return adminClient;
}

async function findAuthUserByEmail(email: string) {
  const supabase = _getSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

interface EnsureResult {
  userId: string;
  created: boolean;
}

export async function ensureAdminPasswordAuthUser({
  email,
  password,
  name,
  role,
  mustChangePassword,
  resetPassword = false,
}: EnsureAdminAuthUserInput): Promise<EnsureResult> {
  const supabase = _getSupabaseAdminClient();
  const existingUser = await findAuthUserByEmail(email);
  const metadataAttributes = {
    email,
    email_confirm: true,
    user_metadata: {
      name,
    },
    app_metadata: {
      role,
      mustChangePassword,
    },
  };

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      ...metadataAttributes,
      ...(resetPassword && password ? { password } : {}),
    });
    if (error) {
      throw error;
    }

    return { userId: existingUser.id, created: false };
  }

  if (!password) {
    throw new Error('Password is required when creating a Supabase auth user.');
  }

  const { data, error } = await supabase.auth.admin.createUser({
    ...metadataAttributes,
    password,
  });
  if (error) {
    throw error;
  }

  return { userId: data.user.id, created: true };
}

export function getSupabaseAdminClient() {
  return _getSupabaseAdminClient();
}

function getPasswordResetRedirectUrl(): string | undefined {
  return env.ASOF_INTRANET_URL
    ? new URL('/change-password', env.ASOF_INTRANET_URL).toString()
    : undefined;
}

/**
 * Generate a password recovery link for the given address via the Supabase admin client.
 *
 * IMPORTANT: This function only generates a recovery link using generateLink().
 * It does NOT send an email. The caller is responsible for delivering the link
 * to the user (e.g., via an email provider such as Mailjet/Resend/SendGrid).
 *
 * If you want Supabase to send the email automatically, use
 * supabase.auth.resetPasswordForEmail() on the client side instead.
 */
export async function generatePasswordResetLink(email: string): Promise<string> {
  const supabase = _getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: getPasswordResetRedirectUrl(),
    },
  });
  if (error) {
    throw error;
  }
  const link = data.properties?.action_link ?? data.properties?.hashed_token;
  if (!link) {
    throw new Error(
      `generatePasswordResetLink: no action_link or hashed_token returned for ${email}`,
    );
  }
  return link;
}

export async function deleteAdminAuthUser(email: string, adminId?: number) {
  const supabase = _getSupabaseAdminClient();
  const user = await findAuthUserByEmail(email);
  if (!user) return;

  // Log audit *before* deletion so the record exists even if delete fails
  if (adminId !== undefined) {
    try {
      await logAuditAction({
        adminId,
        action: 'delete_auth_user',
        entityType: 'admin',
        entityId: adminId,
        metadata: { targetEmail: email, targetUserId: user.id },
      });
    } catch (auditError) {
      logger.error('[deleteAdminAuthUser] audit logging failed', {
        error: toSafeErrorLog(auditError),
      });
      // Audit failure does not block deletion, but it is logged.
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
