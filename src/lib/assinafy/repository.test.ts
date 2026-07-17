/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  claimAssinafySubmission,
  findOficioByAssinafyDocumentId,
  recordAssinafyReconciliationContext,
  updateAssinafyStatus,
} from './repository';

const { dbMock, MOCK_OFICIO } = vi.hoisted(() => {
  const MOCK_OFICIO = {
    id: 1,
    number: 'Ofício nº 001/2026-ASOF',
    year: 2026,
    sequence: 1,
    recipient: 'Destinatário',
    recipientRole: 'Cargo',
    vocativo: 'Senhor',
    letterDate: '15 de maio de 2026',
    subject: 'Assunto',
    itamaratySector: 'SGP',
    signatoryName: 'Nome',
    signatoryRole: 'Cargo',
    closure: 'Atenciosamente,',
    bodyRichText: 'Texto',
    bodyPlainText: 'Texto',
    pdfStoragePath: null,
    status: 'gerado',
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
    updatedAt: new Date('2026-05-15T11:00:00.000Z'),
    assinafyDocumentId: 'doc123',
    assinafyStatus: 'pending_signature',
    assinafyAssignmentId: null,
    assinafySignerId: null,
    assinafySentAt: null,
    assinafySignedAt: null,
    assinafyError: null,
  };

  let _selectResult: any[] = [MOCK_OFICIO];
  let _updateResult: any[] = [MOCK_OFICIO];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockImplementation(() => Promise.resolve(_selectResult));
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const updateChain: Record<string, any> = {};
  updateChain.set = vi.fn().mockReturnValue(updateChain);
  updateChain.where = vi.fn().mockReturnValue(updateChain);
  updateChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_updateResult));

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
    _setSelectResult: (r: any[]) => { _selectResult = r; },
    _setUpdateResult: (r: any[]) => { _updateResult = r; },
    _selectChain: selectChain,
    _updateChain: updateChain,
  };

  return { dbMock, MOCK_OFICIO };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

describe('assinafy/repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock._setSelectResult([MOCK_OFICIO]);
    dbMock._setUpdateResult([MOCK_OFICIO]);
  });

  describe('findOficioByAssinafyDocumentId', () => {
    it('finds ofício by assinafy document ID', async () => {
      const result = await findOficioByAssinafyDocumentId('doc123');
      expect(result).toEqual(MOCK_OFICIO);
      expect(dbMock.select).toHaveBeenCalled();
    });

    it('returns null when not found', async () => {
      dbMock._setSelectResult([]);
      const result = await findOficioByAssinafyDocumentId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateAssinafyStatus', () => {
    it('updates assinafy status fields', async () => {
      const result = await updateAssinafyStatus(1, 'certificated', {
        assinafySignedAt: new Date('2026-05-20T10:00:00Z'),
      });
      expect(result).toEqual(MOCK_OFICIO);
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock._updateChain.set).toHaveBeenCalled();
      expect(dbMock._updateChain.where).toHaveBeenCalled();
    });
  });

  describe('claimAssinafySubmission', () => {
    it('returns the claimed row from a conditional update', async () => {
      expect(await claimAssinafySubmission(1, 7)).toEqual(MOCK_OFICIO);
      expect(dbMock._updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ assinafyStatus: 'uploading', updatedBy: 7 }),
      );
      expect(dbMock._updateChain.where).toHaveBeenCalled();
    });

    it('returns null when another process already won', async () => {
      dbMock._setUpdateResult([]);
      await expect(claimAssinafySubmission(1, 7)).resolves.toBeNull();
    });
  });

  describe('recordAssinafyReconciliationContext', () => {
    it('persists external IDs without changing the Assinafy status', async () => {
      await recordAssinafyReconciliationContext(1, {
        assinafyDocumentId: 'doc-new',
        assinafySignerId: 'signer-new',
        assinafyAssignmentId: 'assignment-new',
        assinafyError: 'Manual reconciliation required.',
        updatedBy: 7,
      });

      expect(dbMock._updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          assinafyDocumentId: 'doc-new',
          assinafySignerId: 'signer-new',
          assinafyAssignmentId: 'assignment-new',
          assinafyError: 'Manual reconciliation required.',
          updatedBy: 7,
        }),
      );
      expect(dbMock._updateChain.set.mock.calls[0]![0]).not.toHaveProperty('assinafyStatus');
    });
  });
});
