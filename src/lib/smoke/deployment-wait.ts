import { normalizeFullGitSha } from './runtime-contract';

interface DeploymentWaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 4 * 60_000;
const DEFAULT_INTERVAL_MS = 5_000;

export async function waitForExpectedDeploymentSha(
  expectedCommitSha: string,
  readObservedCommitSha: () => Promise<unknown>,
  options: DeploymentWaitOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;
  let observedCommitSha: string | null = null;

  do {
    try {
      const observed = await readObservedCommitSha();
      observedCommitSha = typeof observed === 'string' ? normalizeFullGitSha(observed) : null;
    } catch {
      observedCommitSha = null;
    }

    if (observedCommitSha === expectedCommitSha) {
      return observedCommitSha;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remainingMs)));
  } while (Date.now() <= deadline);

  throw new Error(
    `Deployment SHA mismatch: expected=${expectedCommitSha} observed=${observedCommitSha ?? 'null'}`,
  );
}
