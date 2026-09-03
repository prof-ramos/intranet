import { describe, expect, it } from 'vitest';
import { planClearDuplicateIdentityHashes } from './clear-duplicate-identity-hashes';

describe('planClearDuplicateIdentityHashes', () => {
  it('keeps the lowest id and clears the rest per duplicate group', () => {
    expect(
      planClearDuplicateIdentityHashes([
        { column: 'cpf_hash', ids: [714, 201] },
        { column: 'siape_hash', ids: [10, 10, 12] },
      ]),
    ).toEqual([
      {
        column: 'cpf_hash',
        keepId: 201,
        clearIds: [714],
        groupSize: 2,
      },
      {
        column: 'siape_hash',
        keepId: 10,
        clearIds: [12],
        groupSize: 2,
      },
    ]);
  });

  it('ignores singleton groups', () => {
    expect(planClearDuplicateIdentityHashes([{ column: 'primary_email_hash', ids: [1] }])).toEqual(
      [],
    );
  });
});
