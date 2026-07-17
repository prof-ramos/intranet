import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { admins, oficios } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { claimAssinafySubmission } from '@/lib/assinafy/repository';

const runId = Date.now();
let adminId: number;
let oficioId: number;

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
});
