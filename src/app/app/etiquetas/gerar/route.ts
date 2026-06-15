import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { generateEtiquetasFromRecipients, etiquetaRouteRequestSchema } from '@/lib/etiquetas';
import { getEtiquetaRecipientsByIds } from '@/lib/etiquetas/associates';
import { requireRole } from '@/lib/auth/authorization';

const logger = createLogger('etiquetas:pimaco');

export async function POST(req: NextRequest) {
  try {
    await requireRole(['admin', 'diretoria', 'secretaria']);
    const body = await req.json();
    const parsed = etiquetaRouteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Verifique os campos do formulário.' }, { status: 400 });
    }

    const recipients = parsed.data.recipientIds?.length
      ? await getEtiquetaRecipientsByIds(parsed.data.recipientIds)
      : parsed.data.recipients;

    if (parsed.data.recipientIds?.length && recipients.length !== parsed.data.recipientIds.length) {
      return NextResponse.json({ error: 'Não foi possível localizar todos os associados selecionados.' }, { status: 400 });
    }

    const pdfBytes = await generateEtiquetasFromRecipients({
      templateCode: parsed.data.templateCode,
      mode: parsed.data.mode,
      recipients,
      selectedFields: parsed.data.selectedFields,
      flags: parsed.data.flags,
      startPosition: parsed.data.startPosition,
      offsetXmm: parsed.data.offsetXmm,
      offsetYmm: parsed.data.offsetYmm,
      debug: parsed.data.debug,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiquetas-asof-${parsed.data.templateCode}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('Erro ao gerar etiquetas', { error: toSafeErrorLog(error) }, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Não foi possível gerar o PDF de etiquetas.' }, { status: 500 });
  }
}
