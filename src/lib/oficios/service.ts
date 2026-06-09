import { db, type Tx } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { oficios } from '@/lib/db/schema/oficios';
import * as repository from './repository';
import { type NewOfficialLetter, type OfficialLetter } from '@/lib/db/schema/oficios';
import { logAuditAction } from '@/lib/audit/service';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { generateOfficialLetterPdf } from './pdf';
import { cleanSignatoryName } from './utils';
import { AssinafyClient } from '@/lib/assinafy/client';
import * as assinafyRepository from '@/lib/assinafy/repository';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { env } from '@/lib/env';

const logger = createLogger('oficios:service');

const OFFICIAL_LETTER_OPERATIONAL_STATUS = 'gerado' satisfies NewOfficialLetter['status'];

function isOperationalOfficialLetterStatus(status: NewOfficialLetter['status']) {
  return status === OFFICIAL_LETTER_OPERATIONAL_STATUS;
}

export async function generateOfficialLetterNumber(year: number, tx: Tx = db) {
  const lastSequence = await repository.getLastSequenceForYear(year, tx);
  const nextSequence = lastSequence + 1;
  const paddedSequence = String(nextSequence).padStart(3, '0');

  // Format: OFÍCIO Nº 001/2026/ASOF (ABNT standard, uppercase, slash before ASOF)
  const number = `OFÍCIO Nº ${paddedSequence}/${year}/ASOF`;

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

export async function sendForSignature(
  oficioId: number,
  signerEmail: string,
  userId: number,
): Promise<{ success: true; data: OfficialLetter } | { success: false; error: string }> {
  // 1. Assinafy not configured guard
  const apiKey = env.ASSINAFY_API_KEY;
  const accountId = env.ASSINAFY_ACCOUNT_ID;
  if (!apiKey || !accountId) {
    return { success: false, error: 'Assinafy não está configurado. Verifique as variáveis de ambiente.' };
  }

  // 2. Fetch oficio
  const oficio = await repository.findOfficialLetterById(oficioId);
  if (!oficio) {
    return { success: false, error: 'Ofício não encontrado.' };
  }

  // 3. Eligibility check: only gerado or rascunho
  if (oficio.status !== 'gerado' && oficio.status !== 'rascunho') {
    return { success: false, error: `Ofício com status "${oficio.status}" não pode ser enviado para assinatura.` };
  }

  // 4. Idempotency check
  if (oficio.assinafyDocumentId !== null) {
    return { success: false, error: 'Este ofício já foi enviado para assinatura.' };
  }

  try {
    // 5. Validate signer email
    if (!signerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
      return { success: false, error: 'Email do signatário inválido.' };
    }

    // 6. Generate PDF
    const pdfBytes = await generateOfficialLetterPdf(oficio);
    const pdfBuffer = Buffer.from(pdfBytes);

    // 7. Init client
    const client = new AssinafyClient({
      apiKey,
      accountId,
      baseUrl: env.ASSINAFY_BASE_URL,
    });

    // 8. Upload document — filename sanitized for API safety
    const docFilename = `${oficio.number.replace(/[\s/]+/g, '_')}.pdf`;
    const doc = await client.uploadDocument(pdfBuffer, docFilename);

    // 9. Create signer
    const cleanName = cleanSignatoryName(oficio.signatoryName);
    const signer = await client.createSigner(cleanName, signerEmail);

    // 10. Create assignment (virtual method, 30 days expiration)

    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const assignment = await client.createAssignment(doc.id, {
      method: 'virtual',
      signers: [
        {
          id: signer.id,
          verification_method: 'Email',
          notification_methods: ['Email'],
          step: 1,
        },
      ],
      expires_at: expiresAt,
    });

    // 11. Validate signing_urls
    if (!assignment.signing_urls || assignment.signing_urls.length === 0) {
      logger.error('Assinafy returned empty signing_urls', {
        oficioId,
        documentId: doc.id,
        assignmentId: assignment.id,
      });
      return { success: false, error: 'Falha ao obter URL de assinatura. Recursos órfãos criados na Assinafy.' };
    }

    const signingUrl = assignment.signing_urls[0]!.url;

    if (!signingUrl) {
      logger.error('Assinafy returned signing_url element without url', {
        oficioId,
        documentId: doc.id,
        assignmentId: assignment.id,
      });
      return { success: false, error: 'Falha ao obter URL de assinatura.' };
    }

    // 12. DB transaction: update oficio + audit log
    const updated = await db.transaction(async (tx) => {
      // Auto-transition rascunho → gerado before sending (ARCHITECTURE.md §101)
      if (oficio.status === 'rascunho') {
        await tx
          .update(oficios)
          .set({ status: 'gerado', updatedAt: new Date() })
          .where(eq(oficios.id, oficioId));
      }

      const result = await assinafyRepository.updateAssinafyFields(
        oficioId,
        {
          assinafyDocumentId: doc.id,
          assinafyStatus: 'pending_signature',
          assinafySigningUrl: signingUrl,
          assinafyAssignmentId: assignment.id,
          assinafySignerId: signer.id,
          assinafySentAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      await logAuditAction({
        adminId: userId,
        action: 'official_letter_sent_for_signature',
        entityType: 'official_letter',
        entityId: oficioId,
        changes: {
          old: { assinafyDocumentId: null },
          new: { assinafyDocumentId: doc.id, assinafyStatus: 'pending_signature' },
        },
        executor: tx,
      });

      return result;
    });

    if (!updated) {
      return { success: false, error: 'Ofício não encontrado ao atualizar.' };
    }

    logger.info('Ofício sent for signature', {
      oficioId,
      documentId: doc.id,
      signerId: signer.id,
      assignmentId: assignment.id,
    });

    // 13. Return success
    return { success: true, data: updated };
  } catch (error) {
    logger.error(
      '[sendForSignature] failed',
      { oficioId, error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: 'Falha ao enviar ofício para assinatura.' };
  }
}
