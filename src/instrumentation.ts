export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerUnhandledHandlers } = await import('@/lib/errors/unhandled');
    registerUnhandledHandlers();
  }
}
