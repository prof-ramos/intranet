import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { findOfficialLetterById } from '@/lib/oficios/repository';
import { generateOfficialLetterPdf } from '@/lib/oficios/pdf';
import { logAuditAction } from '@/lib/audit/service';

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  const officialLetterId = parseInt(id);
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
    console.error('PDF download failed for oficio', officialLetterId);
    return new NextResponse('Erro ao gerar PDF', { status: 500 });
  }

  try {
    await logAuditAction({
      adminId: user.userId,
      action: 'official_letter_downloaded',
      entityType: 'official_letter',
      entityId: oficio.id,
      metadata: { number: oficio.number },
    });
  } catch {
    // Audit logging failure should not block the download
  }

  return new NextResponse(new Uint8Array(pdfBytes).buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${oficio.number.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`,
    },
  });
}
