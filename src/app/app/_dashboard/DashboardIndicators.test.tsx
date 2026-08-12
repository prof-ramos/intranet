// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DashboardIndicators } from './DashboardIndicators';

afterEach(cleanup);

describe('DashboardIndicators', () => {
  it('makes every indicator an operational link', () => {
    render(
      <DashboardIndicators
        inadimplentesCount={2}
        stripe={[
          { id: 'associates', value: '10', label: 'Associados', href: '/app/associados' },
          { id: 'activities', value: '4', label: 'Atividades', href: '/app/atividades' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /associados/i }).getAttribute('href')).toBe(
      '/app/associados',
    );
    expect(screen.getByRole('link', { name: /atividades/i }).getAttribute('href')).toBe(
      '/app/atividades',
    );
    expect(screen.getByRole('link', { name: /inadimplentes/i }).getAttribute('href')).toBe(
      '/app/associados?contributionStatus=inadimplente',
    );
  });

  it('gives each geographic segment its own filtered destination', () => {
    render(
      <DashboardIndicators
        inadimplentesCount={0}
        stripe={[
          {
            id: 'location',
            value: '',
            label: 'Distribuição',
            href: '/app/associados',
            segments: [
              {
                id: 'brasil',
                value: '3',
                label: 'Associados Brasil',
                href: '/app/associados?associationStatus=associado&location=brasil',
              },
              {
                id: 'exterior',
                value: '7',
                label: 'Associados exterior',
                href: '/app/associados?associationStatus=associado&location=exterior',
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /associados brasil/i }).getAttribute('href')).toBe(
      '/app/associados?associationStatus=associado&location=brasil',
    );
    expect(screen.getByRole('link', { name: /associados exterior/i }).getAttribute('href')).toBe(
      '/app/associados?associationStatus=associado&location=exterior',
    );
  });
});
