import { describe, expect, it, vi } from 'vitest';
import { waitForExpectedDeploymentSha } from './deployment-wait';

const EXPECTED_SHA = '0123456789abcdef0123456789abcdef01234567';

describe('waitForExpectedDeploymentSha', () => {
  it('waits until the authenticated health reader observes the exact expected SHA', async () => {
    const readObservedCommitSha = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(EXPECTED_SHA);

    await expect(
      waitForExpectedDeploymentSha(EXPECTED_SHA, readObservedCommitSha, {
        timeoutMs: 50,
        intervalMs: 1,
      }),
    ).resolves.toBe(EXPECTED_SHA);
    expect(readObservedCommitSha).toHaveBeenCalledTimes(2);
  });

  it('fails with only the expected and observed SHAs when the deadline expires', async () => {
    const observedSha = 'fedcba9876543210fedcba9876543210fedcba98';

    await expect(
      waitForExpectedDeploymentSha(EXPECTED_SHA, async () => observedSha, {
        timeoutMs: 0,
        intervalMs: 1,
      }),
    ).rejects.toThrow(`Deployment SHA mismatch: expected=${EXPECTED_SHA} observed=${observedSha}`);
  });
});
