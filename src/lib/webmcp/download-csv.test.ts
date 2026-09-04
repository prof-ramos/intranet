// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadAuthenticatedCsv } from './download-csv';

describe('downloadAuthenticatedCsv', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:csv'),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('surfaces 429 instead of claiming success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        blob: async () => new Blob(),
        headers: new Headers(),
      }),
    );

    await expect(downloadAuthenticatedCsv('/app/secretaria/mala-direta/download')).resolves.toEqual({
      ok: false,
      status: 429,
      message: 'Muitas exportações. Aguarde um minuto e tente de novo.',
    });
  });

  it('triggers a blob download on 200', async () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      return { click, rel: '', href: '', download: '', remove: vi.fn() } as unknown as HTMLAnchorElement;
    });
    vi.spyOn(document.body, 'append').mockImplementation(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => new Blob(['Name,Email'], { type: 'text/csv' }),
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="mala-direta-gmail-2026-09-04.csv"',
        }),
      }),
    );

    await expect(downloadAuthenticatedCsv('/app/secretaria/mala-direta/download')).resolves.toEqual({
      ok: true,
      filename: 'mala-direta-gmail-2026-09-04.csv',
    });
    expect(click).toHaveBeenCalled();
  });
});
