/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HealthAgreementManager } from './DependentManager';

describe('HealthAgreementManager', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders health agreement date ranges and open-ended dates in DD/MM/YYYY', () => {
    render(
      <HealthAgreementManager
        associateId={42}
        items={[
          {
            id: 1,
            provider: 'Plano completo',
            startDate: '2026-07-01',
            endDate: '2026-07-31',
          },
          {
            id: 2,
            provider: 'Plano vigente',
            startDate: '2026-08-15',
            endDate: null,
          },
          {
            id: 3,
            provider: 'Plano encerrado',
            startDate: null,
            endDate: '2026-09-30',
          },
        ]}
      />,
    );

    expect(screen.getByText('01/07/2026 – 31/07/2026')).toBeDefined();
    expect(screen.getByText('Desde 15/08/2026')).toBeDefined();
    expect(screen.getByText('Até 30/09/2026')).toBeDefined();
  });
});
