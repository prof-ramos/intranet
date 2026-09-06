import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  cancelMailingCampaign,
  createMailingCampaign,
  previewMailingAudience,
  processMailingBatch,
  startMailingCampaign,
} from './service';

const findSendingCampaigns = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((callback: (tx: unknown) => Promise<number> | Promise<void>) =>
      callback({}),
    ),
    query: {
      mailingCampaigns: {
        findMany: (...args: unknown[]) => findSendingCampaigns(...args),
      },
    },
  },
}));

vi.mock('./queries', () => ({
  countAudience: vi.fn(),
  fetchAudience: vi.fn(),
  getCampaignAssociateIds: vi.fn().mockResolvedValue([]),
  getMailingRecipientContexts: vi.fn().mockResolvedValue([]),
}));

vi.mock('./repository', () => ({
  insertCampaignWithRecipients: vi.fn(),
  getCampaignById: vi.fn(),
  updateCampaignStatus: vi.fn(),
  cancelPendingRecipients: vi.fn(),
  claimPendingRecipients: vi.fn().mockResolvedValue([]),
  getPendingRecipients: vi.fn().mockResolvedValue([]),
  finalizeCampaignProgress: vi.fn().mockResolvedValue({
    totals: { sent: 0, failed: 0, pending: 1 },
    terminalStatus: null,
    transitioned: false,
  }),
  markRecipientResult: vi.fn(),
  markRecipientCancelled: vi.fn(),
}));

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: vi.fn((value: string) => `enc:${value}`),
  decryptPii: vi.fn((value: string) => (value.startsWith('enc:') ? value.slice(4) : value)),
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
import { sendEmail } from '@/lib/email';

const mockedQueries = vi.mocked(queries);
const mockedRepository = vi.mocked(repository);
const mockedSendEmail = vi.mocked(sendEmail);

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

describe('cancelMailingCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancela rascunho ou envio em andamento', async () => {
    mockedRepository.getCampaignById.mockResolvedValue({
      id: 5,
      status: 'em_envio',
    } as never);

    await cancelMailingCampaign(5, USER_ID);

    expect(mockedRepository.updateCampaignStatus).toHaveBeenCalledWith(
      expect.anything(),
      5,
      'cancelada',
    );
    expect(mockedRepository.cancelPendingRecipients).toHaveBeenCalledWith(expect.anything(), 5);
  });
});

describe('processMailingBatch', () => {
  const campaign = {
    id: 9,
    channel: 'email',
    status: 'em_envio',
    subject: 'Assembleia',
    templateBody: 'Olá {{nome}}',
    startedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findSendingCampaigns.mockResolvedValue([campaign]);
    mockedRepository.getCampaignById.mockResolvedValue(campaign as never);
  });

  it('envia para não associado usando o snapshot e o contexto sem filtro de vínculo', async () => {
    mockedRepository.claimPendingRecipients.mockResolvedValue([
      {
        id: 101,
        associateId: 44,
        recipientName: 'Carla Não Associada',
        emailCiphertext: 'enc:carla@asof.org.br',
      },
    ]);
    mockedQueries.getMailingRecipientContexts.mockResolvedValue([
      {
        associateId: 44,
        nome: 'Carla Não Associada',
        matricula: '123',
        categoria: null,
        situacaoAssociativa: 'nao_associado',
        lotacao: 'SERE',
        padrao: 'Especial V',
        enderecoCompleto: null,
        bairro: null,
        cidade: 'Brasília',
        uf: 'DF',
        cep: null,
        email: 'carla@asof.org.br',
        telefone: null,
      },
    ]);

    const result = await processMailingBatch(10);

    expect(mockedQueries.getMailingRecipientContexts).toHaveBeenCalledWith([44]);
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'carla@asof.org.br',
        toName: 'Carla Não Associada',
        subject: 'Assembleia',
      }),
    );
    expect(mockedRepository.markRecipientResult).toHaveBeenCalledWith(expect.anything(), 101, {
      ok: true,
    });
    expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
  });

  it('envia com nome e e-mail do snapshot quando o cadastro some', async () => {
    mockedRepository.claimPendingRecipients.mockResolvedValue([
      {
        id: 102,
        associateId: 99,
        recipientName: 'Oficial Removido',
        emailCiphertext: 'enc:removido@asof.org.br',
      },
    ]);
    mockedQueries.getMailingRecipientContexts.mockResolvedValue([]);

    const result = await processMailingBatch(10);

    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'removido@asof.org.br',
        toName: 'Oficial Removido',
      }),
    );
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('não envia destinatários reivindicados depois do cancelamento da campanha', async () => {
    mockedRepository.claimPendingRecipients.mockResolvedValue([
      {
        id: 103,
        associateId: 1,
        recipientName: 'Ana',
        emailCiphertext: 'enc:ana@asof.org.br',
      },
    ]);
    mockedRepository.getCampaignById.mockResolvedValue({
      ...campaign,
      status: 'cancelada',
    } as never);

    const result = await processMailingBatch(10);

    expect(mockedSendEmail).not.toHaveBeenCalled();
    expect(mockedRepository.markRecipientCancelled).toHaveBeenCalledWith(expect.anything(), 103);
    expect(result).toEqual({ processed: 1, sent: 0, failed: 0 });
  });

  it('audita conclusão quando o worker fecha a campanha em envio', async () => {
    mockedRepository.claimPendingRecipients.mockResolvedValue([]);
    mockedRepository.finalizeCampaignProgress.mockResolvedValue({
      totals: { sent: 4, failed: 1, pending: 0 },
      terminalStatus: 'concluida',
      transitioned: true,
    });

    await processMailingBatch(10);

    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: null,
        action: 'mailing.campaign.completed',
        metadata: expect.objectContaining({ campaignId: 9, sent: 4, failed: 1 }),
      }),
    );
  });

  it('audita falha total sem sobrescrever quando a finalização não transiciona', async () => {
    mockedRepository.claimPendingRecipients.mockResolvedValue([]);
    mockedRepository.finalizeCampaignProgress.mockResolvedValue({
      totals: { sent: 0, failed: 3, pending: 0 },
      terminalStatus: 'falhou',
      transitioned: false,
    });

    await processMailingBatch(10);

    expect(logAuditAction).not.toHaveBeenCalled();
  });
});

// Mantém dbMock referenciado para evitar lint de import não usado.
void dbMock;
