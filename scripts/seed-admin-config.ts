import { validateNewPassword } from '../src/lib/auth/password';

type SeedAdminEnv = Record<string, string | undefined>;

export function getInitialAdminCredentials(env: SeedAdminEnv = process.env) {
  const email = env.INITIAL_ADMIN_EMAIL;
  const password = env.INITIAL_ADMIN_PASSWORD;

  if (!email) {
    throw new Error('INITIAL_ADMIN_EMAIL must be set.');
  }

  if (!password) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be set and at least 12 characters long.');
  }

  const validation = validateNewPassword(password);
  if (!validation.valid) {
    throw new Error(`INITIAL_ADMIN_PASSWORD invalid: ${validation.message}`);
  }

  return { email, password };
}
