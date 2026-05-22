import { db, type Tx } from '@/lib/db';
import * as repository from './repository';
import { type NewOfficialLetter } from '@/lib/db/schema/oficios';
import { logAuditAction } from '@/lib/audit/service';
import { emitDomainEvent } from '@/lib/integrations/outbox';

const OFFICIAL_LETTER_OPERATIONAL_STATUS = 'gerado' satisfies NewOfficialLetter['status'];

function isOperationalOfficialLetterStatus(status: NewOfficialLetter['status']) {
  return status === OFFICIAL_LETTER_OPERATIONAL_STATUS;
}

export async function generateOfficialLetterNumber(year: number, tx: Tx = db) {
  const lastSequence = await repository.getLastSequenceForYear(year, tx);
  const nextSequence = lastSequence + 1;
  const paddedSequence = String(nextSequence).padStart(3, '0');

  // Format: OFÍCIO No 001/2026/ASOF
  const number = `OFÍCIO No ${paddedSequence}/${year}/ASOF`;

  return { number, sequence: nextSequence };
}

export async function saveOfficialLetter(
  data: Omit<NewOfficialLetter, 'number' | 'year' | 'sequence' | 'createdBy'>,
  userId: number,
) {
  return db.transaction(async (tx) => {
    const year = new Date().getFullYear();
    const { number, sequence } = await generateOfficialLetterNumber(year, tx);

    const result = await repository.createOfficialLetter(
      {
        ...data,
        number,
        year,
        sequence,
        createdBy: userId,
      },
      tx,
    );

    await logAuditAction({
      adminId: userId,
      action: 'official_letter_created',
      entityType: 'official_letter',
      entityId: result.id,
      changes: { old: {}, new: result },
      metadata: { number: result.number },
    });

    if (isOperationalOfficialLetterStatus(result.status)) {
      await emitDomainEvent(
        {
          type: 'official_letter.created',
          entityType: 'official_letter',
          entityId: result.id,
          actorAdminId: userId,
          payload: {
            number: result.number,
            status: result.status,
            year: result.year,
            sequence: result.sequence,
            links: {
              app: `/app/secretaria/oficios/${result.id}`,
            },
          },
        },
        tx,
      );
    }

    return result;
  });
}

export async function updateOfficialLetter(
  id: number,
  data: Partial<NewOfficialLetter>,
  userId: number,
) {
  return db.transaction(async (tx) => {
    const old = await repository.findOfficialLetterById(id, tx);
    if (!old) throw new Error('Ofício não encontrado.');

    const result = await repository.updateOfficialLetter(id, { ...data, updatedBy: userId }, tx);
    if (!result) {
      throw new Error('Falha ao atualizar ofício.');
    }

    await logAuditAction({
      adminId: userId,
      action: 'official_letter_updated',
      entityType: 'official_letter',
      entityId: id,
      changes: { old, new: result },
    });

    if (
      !isOperationalOfficialLetterStatus(old.status) &&
      isOperationalOfficialLetterStatus(result.status)
    ) {
      await emitDomainEvent(
        {
          type: 'official_letter.published',
          entityType: 'official_letter',
          entityId: result.id,
          actorAdminId: userId,
          payload: {
            number: result.number,
            status: result.status,
            year: result.year,
            sequence: result.sequence,
            links: {
              app: `/app/secretaria/oficios/${result.id}`,
            },
          },
        },
        tx,
      );
    }

    return result;
  });
}

export async function cancelOfficialLetter(id: number, userId: number) {
  return db.transaction(async (tx) => {
    const old = await repository.findOfficialLetterById(id, tx);
    if (!old) throw new Error('Ofício não encontrado.');

    const result = await repository.cancelOfficialLetter(id, userId, tx);

    await logAuditAction({
      adminId: userId,
      action: 'official_letter_cancelled',
      entityType: 'official_letter',
      entityId: id,
      changes: { old, new: result },
    });

    return result;
  });
}
