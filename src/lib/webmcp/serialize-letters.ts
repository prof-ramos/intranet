import type { OfficialLetter } from '@/lib/db/schema/oficios';

export function serializeOfficialLetterListItem(letter: OfficialLetter) {
  return {
    id: letter.id,
    number: letter.number,
    year: letter.year,
    status: letter.status,
    recipient: letter.recipient,
    subject: letter.subject,
    letterDate: letter.letterDate,
    assinafyStatus: letter.assinafyStatus,
    href: `/app/secretaria/oficios/${letter.id}/editar`,
  };
}

export function serializeOfficialLetterDetail(letter: OfficialLetter) {
  return {
    ...serializeOfficialLetterListItem(letter),
    recipientRole: letter.recipientRole,
    vocativo: letter.vocativo,
    itamaratySector: letter.itamaratySector,
    signatoryName: letter.signatoryName,
    signatoryRole: letter.signatoryRole,
    closure: letter.closure,
    bodyPlainText: letter.bodyPlainText,
    assinafySigningUrl: letter.assinafySigningUrl,
  };
}
