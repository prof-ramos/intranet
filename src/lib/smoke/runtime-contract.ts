const FULL_GIT_SHA = /^[0-9a-f]{40}$/i;
const RUN_ID = /^\d+-\d+$/;

export interface SmokeRuntimeContract {
  expectedCommitSha: string;
  allowMutations: boolean;
  runId: string | null;
  markerPrefix: string | null;
  cleanupLikePattern: string | null;
}

export function normalizeFullGitSha(value: string | undefined): string | null {
  if (!value || !FULL_GIT_SHA.test(value)) {
    return null;
  }

  return value.toLowerCase();
}

export function parseSmokeRuntimeContract(
  environment: Record<string, string | undefined>,
): SmokeRuntimeContract {
  const expectedCommitSha = normalizeFullGitSha(environment.SMOKE_EXPECTED_COMMIT_SHA);
  if (!expectedCommitSha) {
    throw new Error('Smoke runtime contract requires a full expected commit SHA.');
  }

  const allowMutations = environment.SMOKE_ALLOW_MUTATIONS === 'true';
  if (!allowMutations) {
    return {
      expectedCommitSha,
      allowMutations: false,
      runId: null,
      markerPrefix: null,
      cleanupLikePattern: null,
    };
  }

  const runId = environment.SMOKE_RUN_ID;
  if (!runId || !RUN_ID.test(runId)) {
    throw new Error('Smoke runtime contract requires a valid run ID before mutations.');
  }

  return {
    expectedCommitSha,
    allowMutations: true,
    runId,
    markerPrefix: `SMOKE_${runId}_`,
    cleanupLikePattern: `SMOKE\\_${runId}\\_%`,
  };
}
