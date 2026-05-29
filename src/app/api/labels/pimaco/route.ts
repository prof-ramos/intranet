import { NextRequest, NextResponse } from 'next/server';
import { generateLabelsPdf } from '@/lib/labels/generate-labels-pdf';
import { LABEL_PRESETS } from '@/lib/labels/presets';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/authorization';

const requestSchema = z.object({
  presetId: z.string(),
  startPosition: z.number().int().min(0).default(0),
  drawDebugGrid: z.boolean().default(false),
  items: z.array(
    z.object({
      id: z.string().max(80),
      name: z.string().max(160).optional(),
      line1: z.string().max(160).optional(),
      line2: z.string().max(160).optional(),
      line3: z.string().max(160).optional(),
    })
  ).max(600).default([]),
});

export async function POST(req: NextRequest) {
  try {
    // Apenas admins ou perfis autorizados devem gerar etiquetas
    const user = await requireRole(['admin', 'diretoria', 'secretaria']);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.format() }, { status: 400 });
    }

    const { presetId, items, startPosition, drawDebugGrid } = result.data;

    const preset = LABEL_PRESETS[presetId];
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const labelsPerPage = preset.grid.columns * preset.grid.rows;
    if (startPosition >= labelsPerPage) {
      return NextResponse.json({ error: `startPosition must be less than labelsPerPage (${labelsPerPage})` }, { status: 400 });
    }

    const pdfBytes = await generateLabelsPdf({
      preset,
      items,
      startPosition,
      drawDebugGrid,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="etiquetas.pdf"',
      },
    });
  } catch (error) {
    console.error('Error generating labels PDF:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
