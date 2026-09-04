import { describe, expect, it } from 'vitest';
import type { OfficialLetter } from '@/lib/db/schema/oficios';
import { serializeOfficialLetterDetail, serializeOfficialLetterListItem } from './serialize-letters';

describe('serializeOfficialLetter', () => {
  const letter = {
    id: 11,
    number: '12/2026-ASOF',
    year: 2026,
    status: 'gerado',
    recipient: 'Ministro',
    recipientRole: 'Ministro de Estado',
    subject: 'Encaminhamento',
    letterDate: '2026-09-04',
    assinafyStatus: null,
    vocativo: 'Senhor Ministro',
    itamaratySector: 'SERE',
    signatoryName: 'ANA SILVA',
    signatoryRole: 'Presidente',
    closure: 'Atenciosamente,',
    bodyPlainText: 'Texto do ofício',
    bodyRichText: '<p>Texto do ofício</p>',
    assinafySigningUrl: null,
  } as unknown as OfficialLetter;

  it('omits the rich-text body from list items', () => {
    const item = serializeOfficialLetterListItem(letter);
    expect(item.href).toBe('/app/secretaria/oficios/11/editar');
    expect(item).not.toHaveProperty('bodyRichText');
    expect(item).not.toHaveProperty('bodyPlainText');
  });

  it('includes plain text on the detail payload', () => {
    const detail = serializeOfficialLetterDetail(letter);
    expect(detail.bodyPlainText).toBe('Texto do ofício');
    expect(detail).not.toHaveProperty('bodyRichText');
  });
});
