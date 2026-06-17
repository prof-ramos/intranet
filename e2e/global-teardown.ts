import { existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';

const DEV_SERVER_PID_FILE = path.resolve(process.cwd(), '.next-e2e/e2e-dev-server.pid');

function killE2EServer(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    // Fall back to killing the direct process on platforms/shells without groups.
  }

  try {
    process.kill(pid, signal);
  } catch {
    // Process already exited.
  }
}

export default async function globalTeardown() {
  const devServer = globalThis.__DEV_SERVER__;

  if (devServer) {
    devServer.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!devServer.killed) {
      devServer.kill('SIGKILL');
    }
  }

  try {
    if (existsSync(DEV_SERVER_PID_FILE)) {
      const pid = Number(readFileSync(DEV_SERVER_PID_FILE, 'utf8'));
      if (Number.isInteger(pid) && pid > 0) {
        killE2EServer(pid, 'SIGTERM');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        killE2EServer(pid, 'SIGKILL');
      }
      unlinkSync(DEV_SERVER_PID_FILE);
    }
  } catch {
    // Best-effort cleanup only; test failures should not be hidden by teardown.
  }

  // Stop Assinafy mock server
  if (globalThis.__ASSINAFY_MOCK__) {
    await globalThis.__ASSINAFY_MOCK__.stop();
  }
}
