import { describe, expect, it } from 'vitest';
import type { OfficialLetter } from '@/lib/db/schema/oficios';
import type { OfficialLetterListItem } from '@/lib/oficios/repository';
import {
  serializeOfficialLetterDetail,
  serializeOfficialLetterListItem,
} from './serialize-letters';

describe('serializeOfficialLetter', () => {
  const listItem: OfficialLetterListItem = {
    id: 11,
    number: '12/2026-ASOF',
    year: 2026,
    status: 'gerado',
    recipient: 'Ministro',
    subject: 'Encaminhamento',
    letterDate: '2026-09-04',
    signatoryName: 'ANA SILVA',
    assinafyDocumentId: null,
    assinafyStatus: null,
    assinafySigningUrl: null,
  };

  const letter = {
    ...listItem,
    recipientRole: 'Ministro de Estado',
    vocativo: 'Senhor Ministro',
    itamaratySector: 'SERE',
    signatoryRole: 'Presidente',
    closure: 'Atenciosamente,',
    bodyPlainText: 'Texto do ofício',
    bodyRichText: '<p>Texto do ofício</p>',
  } as unknown as OfficialLetter;

  it('serializes slim list projections without body fields', () => {
    const item = serializeOfficialLetterListItem(listItem);
    expect(item).toEqual({
      id: 11,
      number: '12/2026-ASOF',
      year: 2026,
      status: 'gerado',
      recipient: 'Ministro',
      subject: 'Encaminhamento',
      letterDate: '2026-09-04',
      assinafyStatus: null,
      href: '/app/secretaria/oficios/11/editar',
    });
    expect(item).not.toHaveProperty('bodyRichText');
    expect(item).not.toHaveProperty('bodyPlainText');
    expect(item).not.toHaveProperty('signatoryName');
  });

  it('includes plain text on the detail payload', () => {
    const detail = serializeOfficialLetterDetail(letter);
    expect(detail.bodyPlainText).toBe('Texto do ofício');
    expect(detail.year).toBe(2026);
    expect(detail).not.toHaveProperty('bodyRichText');
  });
});
