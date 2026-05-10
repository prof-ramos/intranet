export default async function globalTeardown() {
  const devServer = (globalThis as unknown as Record<string, unknown>).__DEV_SERVER__ as
    | import('child_process').ChildProcess
    | undefined;

  if (devServer) {
    devServer.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!devServer.killed) {
      devServer.kill('SIGKILL');
    }
  }
}
