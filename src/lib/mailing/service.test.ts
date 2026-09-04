import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMailingCampaign, previewMailingAudience, startMailingCampaign } from './service';

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((callback: (tx: unknown) => Promise<number> | Promise<void>) =>
      callback({}),
    ),
  },
}));

vi.mock('./queries', () => ({
  countAudience: vi.fn(),
  fetchAudience: vi.fn(),
  getCampaignAssociateIds: vi.fn().mockResolvedValue([]),
}));

vi.mock('./repository', () => ({
  insertCampaignWithRecipients: vi.fn(),
  getCampaignById: vi.fn(),
  updateCampaignStatus: vi.fn(),
  cancelPendingRecipients: vi.fn(),
  getPendingRecipients: vi.fn().mockResolvedValue([]),
  finalizeCampaignProgress: vi.fn(),
  markRecipientResult: vi.fn(),
}));

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: vi.fn((value: string) => `enc:${value}`),
  decryptPii: vi.fn((value: string) => value),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    MAILJET_API_KEY: 'k',
    MAILJET_SECRET_KEY: 's',
    MAILJET_SENDER_VALIDATED: true,
  },
}));

vi.mock('@/lib/etiquetas', () => ({
  DEFAULT_FIELDS_BY_MODE: { postal: ['nome'] },
  generateEtiquetasFromRecipients: vi.fn(),
  getEtiquetaRecipientsByIds: vi.fn().mockResolvedValue([]),
}));

import * as dbMock from '@/lib/db';
import * as queries from './queries';
import * as repository from './repository';
import { encryptPii } from '@/lib/crypto/pii';
import { logAuditAction } from '@/lib/audit/service';

const mockedQueries = vi.mocked(queries);
const mockedRepository = vi.mocked(repository);

const USER_ID = 1;

describe('previewMailingAudience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna contagem e amostra', async () => {
    mockedQueries.countAudience.mockResolvedValue(3);
    mockedQueries.fetchAudience.mockResolvedValue([
      { associateId: 10, name: 'Ana', email: 'ana@asof.org.br' },
    ]);

    const result = await previewMailingAudience('email', { associationStatus: 'associado' });

    expect(result.count).toBe(3);
    expect(result.sample).toEqual([{ associateId: 10, name: 'Ana' }]);
    expect(result.exceedsLimit).toBe(false);
  });

  it('sinaliza quando a contagem excede o limite', async () => {
    mockedQueries.countAudience.mockResolvedValue(2001);
    mockedQueries.fetchAudience.mockResolvedValue([]);

    const result = await previewMailingAudience('etiquetas', {});
    expect(result.exceedsLimit).toBe(true);
  });
});

describe('createMailingCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria campanha com destinatários cifrados em transação', async () => {
    mockedQueries.countAudience.mockResolvedValue(2);
    mockedQueries.fetchAudience.mockResolvedValue([
      { associateId: 1, name: 'Ana', email: 'ana@asof.org.br' },
      { associateId: 2, name: 'Beto', email: 'beto@asof.org.br' },
    ]);
    mockedRepository.insertCampaignWithRecipients.mockResolvedValue(7);

    const result = await createMailingCampaign(
      {
        name: 'Convite',
        channel: 'email',
        subject: 'Assunto',
        templateBody: 'Olá {{nome}}',
        filters: { associationStatus: 'associado' },
      },
      USER_ID,
    );

    expect(result.id).toBe(7);
    expect(mockedRepository.insertCampaignWithRecipients).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'Convite',
        channel: 'email',
        recipientCount: 2,
        createdBy: USER_ID,
      }),
      expect.arrayContaining([
        expect.objectContaining({
          associateId: 1,
          name: 'Ana',
          emailCiphertext: 'enc:ana@asof.org.br',
        }),
      ]),
    );
    expect(encryptPii).toHaveBeenCalledWith('ana@asof.org.br');
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: USER_ID,
        action: 'mailing.campaign.created',
        metadata: expect.objectContaining({ campaignId: 7, recipientCount: 2 }),
      }),
    );
  });

  it('recusa template com variável desconhecida', async () => {
    await expect(
      createMailingCampaign(
        {
          name: 'Convite',
          channel: 'email',
          subject: 'Assunto',
          templateBody: 'Olá {{cpf}}',
          filters: {},
        },
        USER_ID,
      ),
    ).rejects.toThrow('cpf');

    expect(mockedQueries.countAudience).not.toHaveBeenCalled();
  });

  it('recusa público acima do limite', async () => {
    mockedQueries.countAudience.mockResolvedValue(3000);

    await expect(
      createMailingCampaign(
        {
          name: 'Convite',
          channel: 'email',
          subject: 'Assunto',
          templateBody: 'Olá {{nome}}',
          filters: {},
        },
        USER_ID,
      ),
    ).rejects.toThrow('limite');
  });
});

describe('startMailingCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia campanha de e-mail em rascunho', async () => {
    mockedRepository.getCampaignById.mockResolvedValue({
      id: 5,
      channel: 'email',
      status: 'rascunho',
    } as never);

    await startMailingCampaign(5, USER_ID);

    expect(mockedRepository.updateCampaignStatus).toHaveBeenCalledWith(
      expect.anything(),
      5,
      'em_envio',
      expect.objectContaining({ startedAt: expect.any(Date) }),
    );
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'mailing.campaign.started', adminId: USER_ID }),
    );
  });

  it('recusa iniciar campanha que já está em envio', async () => {
    mockedRepository.getCampaignById.mockResolvedValue({
      id: 5,
      channel: 'email',
      status: 'em_envio',
    } as never);

    await expect(startMailingCampaign(5, USER_ID)).rejects.toThrow('não pode ser iniciada');
  });

  it('recusa iniciar campanha de etiquetas', async () => {
    mockedRepository.getCampaignById.mockResolvedValue({
      id: 5,
      channel: 'etiquetas',
      status: 'rascunho',
    } as never);

    await expect(startMailingCampaign(5, USER_ID)).rejects.toThrow('e-mail');
  });
});

// Mantém dbMock referenciado para evitar lint de import não usado.
void dbMock;
