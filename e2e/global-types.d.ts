/**
 * Global type declarations for E2E test infrastructure.
 *
 * These types allow globalSetup/globalTeardown to share objects
 * without unsafe `as unknown as Record<string, unknown>` casts.
 */
export {};

declare global {
  var __DEV_SERVER__: import('child_process').ChildProcess | undefined;
  var __ASSINAFY_MOCK__: import('./mocks/assinafy-server').AssinafyMockServer | undefined;
}