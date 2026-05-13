import { db, type Tx } from '@/lib/db';
import * as repository from './repository';
import { type NewOfficialLetter } from '@/lib/db/schema/oficios';
import { logAuditAction } from '@/lib/audit/service';

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
  userId: number
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
      tx
    );

    await logAuditAction({
      adminId: userId,
      action: 'official_letter_created',
      entityType: 'official_letter',
      entityId: result.id,
      changes: { old: {}, new: result },
      metadata: { number: result.number },
    });

    return result;
  });
}

export async function updateOfficialLetter(
  id: number,
  data: Partial<NewOfficialLetter>,
  userId: number
) {
  return db.transaction(async (tx) => {
    const old = await repository.findOfficialLetterById(id, tx);
    if (!old) throw new Error('Ofício não encontrado.');

    const result = await repository.updateOfficialLetter(id, { ...data, updatedBy: userId }, tx);

    await logAuditAction({
      adminId: userId,
      action: 'official_letter_updated',
      entityType: 'official_letter',
      entityId: id,
      changes: { old, new: result },
    });

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
