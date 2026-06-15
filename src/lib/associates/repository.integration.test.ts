import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { associates, admins, dependents, healthAgreements } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  createDependent,
  updateDependentById,
  deleteDependentById,
  findDependentsByAssociateId,
  createHealthAgreement,
  updateHealthAgreementById,
  deleteHealthAgreementById,
  findHealthAgreementsByAssociateId,
} from './repository';

describe('associates repository integration — dependents CRUD', () => {
  const testRunId = Date.now();
  let testAdminId: number;
  let testAssociateId: number;
  const dependentIds: number[] = [];

  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Test Admin Dependents',
        email: `test-admin-deps-${testRunId}@example.com`,
        passwordHash: 'hash-placeholder',
        role: 'admin',
      })
      .returning({ id: admins.id });
    testAdminId = admin.id;

    const [associate] = await db
      .insert(associates)
      .values({
        fullName: 'Test Associate for Dependents',
        associationStatus: 'ativo',
        contributionStatus: 'em_dia',
        paymentMethod: 'folha',
      })
      .returning({ id: associates.id });
    testAssociateId = associate.id;
  });

  afterAll(async () => {
    try {
      if (dependentIds.length > 0) {
        await db.delete(dependents).where(inArray(dependents.id, dependentIds));
      }
    } finally {
      await db.delete(associates).where(eq(associates.id, testAssociateId));
      await db.delete(admins).where(eq(admins.id, testAdminId));
    }
  });

  describe('createDependent', () => {
    it('creates a dependent with name and relationship', async () => {
      const result = await createDependent({
        associateId: testAssociateId,
        name: 'Maria Santos',
        relationship: 'conjuge',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Maria Santos');
      expect(result.relationship).toBe('conjuge');
      dependentIds.push(result.id);

      const row = await db
        .select()
        .from(dependents)
        .where(eq(dependents.id, result.id))
        .limit(1);

      expect(row[0].associateId).toBe(testAssociateId);
      expect(row[0].name).toBe('Maria Santos');
      expect(row[0].relationship).toBe('conjuge');
    });

    it('creates a dependent with Unicode name', async () => {
      const result = await createDependent({
        associateId: testAssociateId,
        name: 'João da Silva Jr.',
        relationship: 'filho(a)',
      });

      expect(result.name).toBe('João da Silva Jr.');
      dependentIds.push(result.id);
    });
  });

  describe('findDependentsByAssociateId', () => {
    it('returns dependents ordered by id', async () => {
      const rows = await findDependentsByAssociateId(testAssociateId);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0].id).toBeLessThanOrEqual(rows[1].id);
    });

    it('returns empty array for non-existent associate', async () => {
      const rows = await findDependentsByAssociateId(999999);
      expect(rows).toEqual([]);
    });
  });

  describe('updateDependentById', () => {
    it('updates name and relationship', async () => {
      const created = await createDependent({
        associateId: testAssociateId,
        name: 'Original Name',
        relationship: 'irmao(a)',
      });
      dependentIds.push(created.id);

      await updateDependentById(
        created.id,
        { name: 'Updated Name', relationship: 'conjuge' },
        testAssociateId,
      );

      const row = await db
        .select()
        .from(dependents)
        .where(eq(dependents.id, created.id))
        .limit(1);

      expect(row[0].name).toBe('Updated Name');
      expect(row[0].relationship).toBe('conjuge');
    });

    it('throws when dependent does not belong to associate', async () => {
      const created = await createDependent({
        associateId: testAssociateId,
        name: 'Protected Dep',
        relationship: 'filho(a)',
      });
      dependentIds.push(created.id);

      // Attempt to update using wrong associateId
      await expect(
        updateDependentById(created.id, { name: 'Hacked' }, 999999),
      ).rejects.toThrow('Dependente não encontrado ou já removido.');

      // Verify unchanged
      const row = await db
        .select()
        .from(dependents)
        .where(eq(dependents.id, created.id))
        .limit(1);
      expect(row[0].name).toBe('Protected Dep');
    });
  });

  describe('deleteDependentById', () => {
    it('deletes existing dependent', async () => {
      const created = await createDependent({
        associateId: testAssociateId,
        name: 'To Delete',
        relationship: 'pai/mãe',
      });

      await deleteDependentById(created.id, testAssociateId);

      const row = await db
        .select()
        .from(dependents)
        .where(eq(dependents.id, created.id))
        .limit(1);
      expect(row.length).toBe(0);
    });

    it('throws when dependent does not exist', async () => {
      await expect(deleteDependentById(999999, testAssociateId)).rejects.toThrow(
        'Dependente não encontrado ou já removido.',
      );
    });

    it('throws when associateId does not match', async () => {
      const created = await createDependent({
        associateId: testAssociateId,
        name: 'Wrong Owner',
        relationship: 'tio(a)',
      });
      dependentIds.push(created.id);

      await expect(deleteDependentById(created.id, 999999)).rejects.toThrow(
        'Dependente não encontrado ou já removido.',
      );
    });
  });
});

describe('associates repository integration — health agreements CRUD', () => {
  const testRunId = Date.now();
  let testAdminId: number;
  let testAssociateId: number;
  const healthAgreementIds: number[] = [];

  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Test Admin Health Agreements',
        email: `test-admin-ha-${testRunId}@example.com`,
        passwordHash: 'hash-placeholder',
        role: 'admin',
      })
      .returning({ id: admins.id });
    testAdminId = admin.id;

    const [associate] = await db
      .insert(associates)
      .values({
        fullName: 'Test Associate for Health Agreements',
        associationStatus: 'ativo',
        contributionStatus: 'em_dia',
        paymentMethod: 'folha',
      })
      .returning({ id: associates.id });
    testAssociateId = associate.id;
  });

  afterAll(async () => {
    try {
      if (healthAgreementIds.length > 0) {
        await db
          .delete(healthAgreements)
          .where(inArray(healthAgreements.id, healthAgreementIds));
      }
    } finally {
      await db.delete(associates).where(eq(associates.id, testAssociateId));
      await db.delete(admins).where(eq(admins.id, testAdminId));
    }
  });

  describe('createHealthAgreement', () => {
    it('creates health agreement with provider and dates', async () => {
      const result = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'ASBAC',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.id).toBeDefined();
      expect(result.provider).toBe('ASBAC');
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-12-31');
      healthAgreementIds.push(result.id);

      const row = await db
        .select()
        .from(healthAgreements)
        .where(eq(healthAgreements.id, result.id))
        .limit(1);

      expect(row[0].associateId).toBe(testAssociateId);
      expect(row[0].provider).toBe('ASBAC');
    });

    it('creates health agreement with null dates', async () => {
      const result = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'SINDITAMARATY',
      });

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      healthAgreementIds.push(result.id);
    });

    it('rejects invalid date range via CHECK constraint', async () => {
      await expect(
        createHealthAgreement({
          associateId: testAssociateId,
          provider: 'INVALID',
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        }),
      ).rejects.toThrow();
    });
  });

  describe('findHealthAgreementsByAssociateId', () => {
    it('returns agreements ordered by id', async () => {
      const rows = await findHealthAgreementsByAssociateId(testAssociateId);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0].id).toBeLessThanOrEqual(rows[1].id);
    });

    it('returns empty array for non-existent associate', async () => {
      const rows = await findHealthAgreementsByAssociateId(999999);
      expect(rows).toEqual([]);
    });
  });

  describe('updateHealthAgreementById', () => {
    it('updates provider and dates', async () => {
      const created = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'Original Provider',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      });
      healthAgreementIds.push(created.id);

      await updateHealthAgreementById(
        created.id,
        { provider: 'Updated Provider', endDate: '2024-12-31' },
        testAssociateId,
      );

      const row = await db
        .select()
        .from(healthAgreements)
        .where(eq(healthAgreements.id, created.id))
        .limit(1);

      expect(row[0].provider).toBe('Updated Provider');
      expect(row[0].startDate).toBe('2024-01-01');
      expect(row[0].endDate).toBe('2024-12-31');
    });

    it('throws when agreement does not belong to associate', async () => {
      const created = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'Protected HA',
        startDate: '2024-01-01',
      });
      healthAgreementIds.push(created.id);

      await expect(
        updateHealthAgreementById(created.id, { provider: 'Hacked' }, 999999),
      ).rejects.toThrow('Convênio não encontrado ou já removido.');

      const row = await db
        .select()
        .from(healthAgreements)
        .where(eq(healthAgreements.id, created.id))
        .limit(1);
      expect(row[0].provider).toBe('Protected HA');
    });
  });

  describe('deleteHealthAgreementById', () => {
    it('deletes existing agreement', async () => {
      const created = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'To Delete HA',
      });

      await deleteHealthAgreementById(created.id, testAssociateId);

      const row = await db
        .select()
        .from(healthAgreements)
        .where(eq(healthAgreements.id, created.id))
        .limit(1);
      expect(row.length).toBe(0);
    });

    it('throws when agreement does not exist', async () => {
      await expect(
        deleteHealthAgreementById(999999, testAssociateId),
      ).rejects.toThrow('Convênio não encontrado ou já removido.');
    });

    it('throws when associateId does not match', async () => {
      const created = await createHealthAgreement({
        associateId: testAssociateId,
        provider: 'Wrong Owner HA',
      });
      healthAgreementIds.push(created.id);

      await expect(
        deleteHealthAgreementById(created.id, 999999),
      ).rejects.toThrow('Convênio não encontrado ou já removido.');
    });
  });
});
