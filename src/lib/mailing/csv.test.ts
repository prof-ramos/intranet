import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCampaignEtiquetasCsv } from './csv';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('./queries', () => ({
  getCampaignAssociateIds: vi.fn(),
  getMailingRecipientContexts: vi.fn(),
}));
vi.mock('./repository', () => ({
  getCampaignById: vi.fn(),
}));

import { getCampaignAssociateIds, getMailingRecipientContexts } from './queries';
import { getCampaignById } from './repository';
import type { MailingRecipientContext } from './types';

const getCampaignByIdMock = vi.mocked(getCampaignById);
const getCampaignAssociateIdsMock = vi.mocked(getCampaignAssociateIds);
const getMailingRecipientContextsMock = vi.mocked(getMailingRecipientContexts);

const recipient: MailingRecipientContext = {
  associateId: 1,
  nome: 'João da Silva',
  matricula: '1234',
  categoria: 'Oficial de Chancelaria',
  situacaoAssociativa: 'associado',
  lotacao: 'Brasília',
  padrao: 'Padrão I',
  enderecoCompleto: 'Rua A, 100',
  bairro: 'Centro',
  cidade: 'Brasília',
  uf: 'DF',
  cep: '70000-000',
  email: 'joao@asof.local',
  telefone: '(61) 99999-0000',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildCampaignEtiquetasCsv', () => {
  it('rejeita campanha inexistente', async () => {
    getCampaignByIdMock.mockResolvedValue(null as never);
    await expect(buildCampaignEtiquetasCsv(9)).rejects.toThrow('Campanha não encontrada.');
  });

  it('rejeita campanha de canal não-etiquetas', async () => {
    getCampaignByIdMock.mockResolvedValue({ id: 9, channel: 'email' } as never);
    await expect(buildCampaignEtiquetasCsv(9)).rejects.toThrow(
      'A campanha não usa o canal de etiquetas.',
    );
  });

  it('produz CSV com BOM, header, CRLF e uma linha por destinatário', async () => {
    getCampaignByIdMock.mockResolvedValue({ id: 9, channel: 'etiquetas' } as never);
    getCampaignAssociateIdsMock.mockResolvedValue([1]);
    getMailingRecipientContextsMock.mockResolvedValue([recipient]);

    const csv = await buildCampaignEtiquetasCsv(9);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('nome');
    expect(lines[0]).toContain('matricula');
    expect(lines[0]).toContain('endereco_completo');
    expect(lines[1]).toContain('João da Silva');
    expect(lines[1]).toContain('joao@asof.local');
  });

  it('escapa aspas duplas nos campos', async () => {
    getCampaignByIdMock.mockResolvedValue({ id: 9, channel: 'etiquetas' } as never);
    getCampaignAssociateIdsMock.mockResolvedValue([1]);
    getMailingRecipientContextsMock.mockResolvedValue([{ ...recipient, nome: 'João "J" Silva' }]);

    const csv = await buildCampaignEtiquetasCsv(9);
    expect(csv).toContain('"João ""J"" Silva"');
  });

  it('neutraliza injeção de fórmula CSV (=, +, -, @) com prefixo de tab', async () => {
    getCampaignByIdMock.mockResolvedValue({ id: 9, channel: 'etiquetas' } as never);
    getCampaignAssociateIdsMock.mockResolvedValue([1]);
    getMailingRecipientContextsMock.mockResolvedValue([
      { ...recipient, enderecoCompleto: '=HYPERLINK("http://evil")' },
    ]);

    const csv = await buildCampaignEtiquetasCsv(9);
    expect(csv).toContain('\t=HYPERLINK(""http://evil"")');
  });
});
