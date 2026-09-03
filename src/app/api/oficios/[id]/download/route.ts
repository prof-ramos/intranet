import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { findOfficialLetterById } from '@/lib/oficios/repository';
import { generateOfficialLetterPdf } from '@/lib/oficios/pdf';
import { logAuditBestEffort } from '@/lib/audit/service';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { parsePositiveIntParam } from '@/lib/routing/params';

const logger = createLogger('api:oficios:download');

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const officialLetterId = parsePositiveIntParam(id);
  if (officialLetterId == null) {
    return new NextResponse('ID inválido', { status: 400 });
  }
  const user = await requireRole(ALLOWED_ROLES);

  let oficio: Awaited<ReturnType<typeof findOfficialLetterById>>;
  let pdfBytes: Awaited<ReturnType<typeof generateOfficialLetterPdf>>;

  try {
    oficio = await findOfficialLetterById(officialLetterId);

    if (!oficio) {
      return new NextResponse('Ofício não encontrado', { status: 404 });
    }

    pdfBytes = await generateOfficialLetterPdf(oficio);
  } catch (error) {
    logger.error(
      'PDF download failed for oficio',
      { officialLetterId, error: toSafeErrorLog(error) },
      error as Error,
    );
    return new NextResponse('Erro ao gerar PDF', { status: 500 });
  }

  await logAuditBestEffort(
    {
      adminId: user.userId,
      action: 'official_letter_downloaded',
      entityType: 'official_letter',
      entityId: oficio.id,
      metadata: { number: oficio.number },
    },
    logger,
  );

  return new NextResponse(new Uint8Array(pdfBytes).buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${oficio.number.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
