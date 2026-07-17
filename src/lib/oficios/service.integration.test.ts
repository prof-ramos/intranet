import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { admins, oficios } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { claimAssinafySubmission } from '@/lib/assinafy/repository';
import { saveOfficialLetter } from './service';

const runId = Date.now();
let adminId: number;
let oficioId: number;
const createdOficioIds: number[] = [];

describe('oficios service integration', () => {
  beforeAll(async () => {
    const [a] = await db.insert(admins).values({ name: 'Test Admin', email: `int-oficios-${runId}@test.com`, passwordHash: 'hash', role: 'admin' }).returning({ id: admins.id });
    adminId = a.id;
    const [oficio] = await db
      .insert(oficios)
      .values({
        number: `OF-INT-CAS-${runId}`,
        year: 2026,
        sequence: Number(String(runId).slice(-8)),
        recipient: 'Destinatário sintético',
        recipientRole: 'Cargo sintético',
        vocativo: 'Senhor',
        letterDate: '17 de julho de 2026',
        subject: 'Teste de claim concorrente',
        itamaratySector: 'TESTE',
        signatoryName: 'Signatário Sintético',
        signatoryRole: 'Cargo sintético',
        bodyRichText: '<p>Conteúdo sintético</p>',
        bodyPlainText: 'Conteúdo sintético',
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning({ id: oficios.id });
    oficioId = oficio.id;
  });

  afterAll(async () => {
    if (createdOficioIds.length > 0) {
      await db.delete(oficios).where(inArray(oficios.id, createdOficioIds));
    }
    await db.delete(oficios).where(eq(oficios.id, oficioId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('service module loads correctly', async () => {
    const svc = await import('./service');
    expect(svc).toBeDefined();
  });

  it('allows exactly one concurrent Assinafy submission claim', async () => {
    const claims = await Promise.all([
      claimAssinafySubmission(oficioId, adminId),
      claimAssinafySubmission(oficioId, adminId),
    ]);

    expect(claims.filter((claim) => claim !== null)).toHaveLength(1);
    expect(claims.filter((claim) => claim === null)).toHaveLength(1);

    const [stored] = await db
      .select({ assinafyStatus: oficios.assinafyStatus })
      .from(oficios)
      .where(eq(oficios.id, oficioId));
    expect(stored.assinafyStatus).toBe('uploading');
  });

  it('serializes concurrent annual sequence allocation in PostgreSQL', async () => {
    const makeInput = (subject: string) => ({
      recipient: 'Destinatário sintético',
      recipientRole: 'Cargo sintético',
      vocativo: 'Senhor',
      letterDate: '17 de julho de 2026',
      subject,
      itamaratySector: 'TESTE',
      signatoryName: 'Signatário Sintético',
      signatoryRole: 'Cargo sintético',
      bodyRichText: '<p>Conteúdo sintético</p>',
      bodyPlainText: 'Conteúdo sintético',
      status: 'gerado' as const,
      updatedBy: adminId,
    });

    const [first, second] = await Promise.all([
      saveOfficialLetter(makeInput(`Concorrência A ${runId}`), adminId),
      saveOfficialLetter(makeInput(`Concorrência B ${runId}`), adminId),
    ]);
    createdOficioIds.push(first.id, second.id);

    const ordered = [first, second].sort((a, b) => a.sequence - b.sequence);
    expect(ordered[1].sequence).toBe(ordered[0].sequence + 1);
    expect(new Set(ordered.map((oficio) => oficio.number)).size).toBe(2);

    const stored = await db
      .select({ id: oficios.id, sequence: oficios.sequence, number: oficios.number })
      .from(oficios)
      .where(inArray(oficios.id, createdOficioIds));
    expect(stored).toHaveLength(2);
    expect(new Set(stored.map((oficio) => oficio.sequence)).size).toBe(2);
  });
});
