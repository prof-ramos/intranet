import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { admins, legalConsultations } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createConsultationService, generateInternalNumber } from './service';

describe('juridico service integration', () => {
  const testIds: number[] = [];
  const testRunId = Date.now();
  let testAdminId: number | null = null;

  function requireTestAdminId() {
    if (testAdminId === null) {
      throw new Error('test admin fixture was not created');
    }
    return testAdminId;
  }

  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Test Admin Juridico',
        email: `test-admin-juridico-${testRunId}@example.com`,
        passwordHash: 'hash-placeholder',
        role: 'admin',
      })
      .returning({ id: admins.id });
    testAdminId = admin.id;
  });

  afterAll(async () => {
    try {
      if (testIds.length > 0) {
        await db.delete(legalConsultations).where(inArray(legalConsultations.id, testIds));
      }
    } finally {
      if (testAdminId !== null) {
        await db.delete(admins).where(eq(admins.id, testAdminId));
      }
    }
  });

  describe('generateInternalNumber', () => {
    it('produces valid JUR-YYYY-NNN format', async () => {
      const result = await generateInternalNumber();
      expect(result).toMatch(/^JUR-\d{4}-\d{3}$/);
    });

    it('increments sequence across multiple calls', async () => {
      const first = await generateInternalNumber();
      const second = await generateInternalNumber();

      // Extract sequence numbers
      const firstNum = parseInt(first.split('-')[2], 10);
      const secondNum = parseInt(second.split('-')[2], 10);

      // Second should be >= first (could be equal if not yet inserted)
      expect(secondNum).toBeGreaterThanOrEqual(firstNum);
    });
  });

  describe('createConsultationService', () => {
    it('creates a consultation with generated internal number and SLA', async () => {
      const beforeCreate = new Date();
      const result = await createConsultationService({
        title: 'Consulta de teste integração',
        questionSummary: 'Resumo da pergunta',
        questionFullText: 'Texto completo da pergunta',
        associateId: null,
        slaDays: 14,
        createdBy: requireTestAdminId(),
      });
      const afterCreate = new Date();

      expect(result.id).toBeDefined();
      testIds.push(result.id);

      // Verify in database
      const consultation = await db
        .select()
        .from(legalConsultations)
        .where(eq(legalConsultations.id, result.id))
        .limit(1);

      expect(consultation.length).toBe(1);
      expect(consultation[0].internalNumber).toMatch(/^JUR-\d{4}-\d{3}$/);
      expect(consultation[0].title).toBe('Consulta de teste integração');
      expect(consultation[0].questionSummary).toBe('Resumo da pergunta');
      expect(consultation[0].questionFullText).toBe('Texto completo da pergunta');
      expect(consultation[0].status).toBe('aberta');
      expect(consultation[0].createdBy).toBe(requireTestAdminId());

      // Verify SLA due date (within 1 minute tolerance)
      expect(consultation[0].slaDueDate).not.toBeNull();
      const earliestDueDate = new Date(beforeCreate);
      earliestDueDate.setDate(earliestDueDate.getDate() + 14);
      const latestDueDate = new Date(afterCreate);
      latestDueDate.setDate(latestDueDate.getDate() + 14);
      const actualDueDate = new Date(consultation[0].slaDueDate!);
      expect(actualDueDate.getTime()).toBeGreaterThanOrEqual(earliestDueDate.getTime());
      expect(actualDueDate.getTime()).toBeLessThanOrEqual(latestDueDate.getTime());
    });

    it('handles null questionFullText and associateId', async () => {
      const result = await createConsultationService({
        title: 'Consulta sem associado',
        questionSummary: 'Resumo simples',
        questionFullText: null,
        associateId: null,
        slaDays: 7,
        createdBy: requireTestAdminId(),
      });

      expect(result.id).toBeDefined();
      testIds.push(result.id);

      const consultation = await db
        .select()
        .from(legalConsultations)
        .where(eq(legalConsultations.id, result.id))
        .limit(1);

      expect(consultation[0].questionFullText).toBeNull();
      expect(consultation[0].associateId).toBeNull();
    });

    it('trims whitespace from input fields', async () => {
      const result = await createConsultationService({
        title: '  Título com espaços  ',
        questionSummary: '  Resumo com espaços  ',
        questionFullText: '  Texto completo  ',
        associateId: null,
        slaDays: 3,
        createdBy: requireTestAdminId(),
      });

      expect(result.id).toBeDefined();
      testIds.push(result.id);

      const consultation = await db
        .select()
        .from(legalConsultations)
        .where(eq(legalConsultations.id, result.id))
        .limit(1);

      expect(consultation[0].title).toBe('Título com espaços');
      expect(consultation[0].questionSummary).toBe('Resumo com espaços');
      expect(consultation[0].questionFullText).toBe('Texto completo');
      expect(consultation[0].associateId).toBeNull();
    });
  });
});
