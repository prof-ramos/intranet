import { describe, expect, it } from 'vitest';
import { normalizeFullGitSha, parseSmokeRuntimeContract } from './runtime-contract';

describe('normalizeFullGitSha', () => {
  it('accepts a full hexadecimal commit SHA and normalizes its case', () => {
    expect(normalizeFullGitSha('ABCDEF0123456789ABCDEF0123456789ABCDEF01')).toBe(
      'abcdef0123456789abcdef0123456789abcdef01',
    );
  });

  it.each([undefined, '', 'abc123', 'g'.repeat(40), 'a'.repeat(41)])(
    'returns null for an absent or malformed SHA (%s)',
    (value) => {
      expect(normalizeFullGitSha(value)).toBeNull();
    },
  );
});

describe('parseSmokeRuntimeContract', () => {
  const expectedCommitSha = '0123456789abcdef0123456789abcdef01234567';

  it('defaults to a read-only execution without creating a marker', () => {
    expect(
      parseSmokeRuntimeContract({
        SMOKE_EXPECTED_COMMIT_SHA: expectedCommitSha,
      }),
    ).toEqual({
      expectedCommitSha,
      allowMutations: false,
      runId: null,
      markerPrefix: null,
      cleanupLikePattern: null,
    });
  });

  it.each(['false', 'TRUE', '1'])('keeps mutations disabled for the flag value %s', (flag) => {
    expect(
      parseSmokeRuntimeContract({
        SMOKE_EXPECTED_COMMIT_SHA: expectedCommitSha,
        SMOKE_ALLOW_MUTATIONS: flag,
        SMOKE_RUN_ID: '29630012345-2',
      }),
    ).toMatchObject({
      allowMutations: false,
      runId: null,
      markerPrefix: null,
      cleanupLikePattern: null,
    });
  });

  it('enables mutations only with an explicit true flag and a run-scoped identifier', () => {
    expect(
      parseSmokeRuntimeContract({
        SMOKE_EXPECTED_COMMIT_SHA: expectedCommitSha,
        SMOKE_ALLOW_MUTATIONS: 'true',
        SMOKE_RUN_ID: '29630012345-2',
      }),
    ).toEqual({
      expectedCommitSha,
      allowMutations: true,
      runId: '29630012345-2',
      markerPrefix: 'SMOKE_29630012345-2_',
      cleanupLikePattern: 'SMOKE\\_29630012345-2\\_%',
    });
  });

  it.each([
    {},
    { SMOKE_EXPECTED_COMMIT_SHA: 'short' },
    {
      SMOKE_EXPECTED_COMMIT_SHA: expectedCommitSha,
      SMOKE_ALLOW_MUTATIONS: 'true',
    },
    {
      SMOKE_EXPECTED_COMMIT_SHA: expectedCommitSha,
      SMOKE_ALLOW_MUTATIONS: 'true',
      SMOKE_RUN_ID: 'run;DELETE',
    },
  ])('fails closed for an invalid execution contract', (environment) => {
    expect(() => parseSmokeRuntimeContract(environment)).toThrow(/Smoke runtime contract/);
  });
});
