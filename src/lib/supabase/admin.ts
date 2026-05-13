import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config';
import type { AuthRole } from '@/lib/auth/config';

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

export async function ensureAdminPasswordAuthUser({
  email,
  password,
  name,
  role,
  mustChangePassword,
  resetPassword = false,
}: EnsureAdminAuthUserInput) {
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

    return existingUser.id;
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

  return data.user.id;
}

export async function deleteAdminAuthUser(email: string) {
  const supabase = getSupabaseAdminClient();
  const user = await findAuthUserByEmail(email);
  if (!user) return;

  console.log('[AUDIT] Deleting Supabase auth user', {
    targetUserId: user.id,
    targetEmail: user.email,
    timestamp: new Date().toISOString(),
  });

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
}
