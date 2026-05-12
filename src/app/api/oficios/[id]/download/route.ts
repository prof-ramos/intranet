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
  const officialLetterId = parseInt(id);

  if (isNaN(officialLetterId)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  try {
    const user = await requireRole(ALLOWED_ROLES);
    const oficio = await findOfficialLetterById(officialLetterId);

    if (!oficio) {
      return new NextResponse('Ofício não encontrado', { status: 404 });
    }

    const pdfBytes = await generateOfficialLetterPdf(oficio);

    await logAuditAction({
      adminId: user.userId,
      action: 'official_letter_downloaded',
      entityType: 'official_letter',
      entityId: oficio.id,
      metadata: { number: oficio.number },
    });

    return new NextResponse(new Uint8Array(pdfBytes).buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${oficio.number.replace(/\//g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Download Error:', error);
    return new NextResponse('Erro ao gerar PDF', { status: 500 });
  }
}
