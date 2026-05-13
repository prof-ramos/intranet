import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config';
import type { AuthRole } from '@/lib/auth/config';
import { logAuditAction } from '@/lib/audit/service';

interface EnsureAdminAuthUserInput {
  email: string;
  password?: string;
  name: string;
  role: AuthRole;
  mustChangePassword: boolean;
  resetPassword?: boolean;
}

let adminClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient() {
  adminClient ??= createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

async function findAuthUserByEmail(email: string) {
  const supabase = getSupabaseAdminClient();
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
  const supabase = getSupabaseAdminClient();
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

export async function deleteAdminAuthUser(email: string, adminId?: number) {
  const supabase = getSupabaseAdminClient();
  const user = await findAuthUserByEmail(email);
  if (!user) return;

  if (adminId !== undefined) {
    await logAuditAction({
      adminId,
      action: 'delete_auth_user',
      entityType: 'admin',
      entityId: undefined,
      metadata: { targetUserId: user.id },
    });
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
