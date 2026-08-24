/**
 * Shared E2E test constants — single source of truth for credentials,
 * infrastructure config, and seed data identifiers.
 *
 * All E2E test files (global-setup, fixtures, specs) and the seed script
 * import from this module to avoid credential drift.
 */

// --- User credentials ---
export const E2E_ADMIN_EMAIL = 'e2e-admin@asof.local';
export const E2E_ADMIN_PASSWORD = 'Senha-Forte-2026!';
export const E2E_DIRETORIA_EMAIL = 'e2e-diretoria@asof.local';
export const E2E_SECRETARIA_EMAIL = 'e2e-secretaria@asof.local';

// Composed user objects (used by fixtures and seed)
export const E2E_USERS = {
  admin: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
  diretoria: { email: E2E_DIRETORIA_EMAIL, password: E2E_ADMIN_PASSWORD },
  secretaria: { email: E2E_SECRETARIA_EMAIL, password: E2E_ADMIN_PASSWORD },
} as const;

export const E2E_AUTH_STATE_DIR = '.next-e2e/auth';
export const E2E_AUTH_ROLES = ['admin', 'diretoria', 'secretaria'] as const;
export type E2EAuthRole = (typeof E2E_AUTH_ROLES)[number];

// --- Infrastructure ---
export const E2E_BASE_URL = 'http://127.0.0.1:3001';
export const E2E_SESSION_SECRET = 'e2e-session-secret-at-least-32-characters-long';
export const E2E_ENCRYPTION_MASTER_KEY = 'e2e-encryption-master-key-at-least-32-chars';
export const E2E_CRON_SECRET = 'dummy_cron_secret_for_e2e_tests';

// --- Assinafy mock ---
export const ASSINAFY_MOCK_PORT = 3099;
export const ASSINAFY_MOCK_KEY = 'e2e-mock-key';
export const ASSINAFY_MOCK_ACCOUNT = 'e2e-mock-account';

// --- Assinafy seed data ---
export const ASSINAFY_DOC_PENDING = 'e2e-doc-pending';
export const ASSINAFY_DOC_CERTIFICATED = 'e2e-doc-certificated';
export const ASSINAFY_SIGNING_URL_PENDING = 'https://assinafy.com.br/sign/e2e-pending';
