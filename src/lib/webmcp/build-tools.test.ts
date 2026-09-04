import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSecretariaTools } from './build-tools';

const {
  globalSearchActionMock,
  searchOfficialsActionMock,
  getOfficialProfileActionMock,
  getOfficialLettersActionMock,
  getOfficialLetterActionMock,
  generateAiTextActionMock,
  sendForSignatureActionMock,
  cancelOfficialLetterActionMock,
  countMalaDiretaAudienceActionMock,
  generateEmailActionMock,
  addDependentActionMock,
  removeDependentActionMock,
  downloadAuthenticatedCsvMock,
} = vi.hoisted(() => ({
  globalSearchActionMock: vi.fn(),
  searchOfficialsActionMock: vi.fn(),
  getOfficialProfileActionMock: vi.fn(),
  getOfficialLettersActionMock: vi.fn(),
  getOfficialLetterActionMock: vi.fn(),
  generateAiTextActionMock: vi.fn(),
  sendForSignatureActionMock: vi.fn(),
  cancelOfficialLetterActionMock: vi.fn(),
  countMalaDiretaAudienceActionMock: vi.fn(),
  generateEmailActionMock: vi.fn(),
  addDependentActionMock: vi.fn(),
  removeDependentActionMock: vi.fn(),
  downloadAuthenticatedCsvMock: vi.fn(),
}));

vi.mock('@/app/app/search/actions', () => ({
  globalSearchAction: (...args: unknown[]) => globalSearchActionMock(...args),
}));

vi.mock('@/app/app/associados/webmcp-actions', () => ({
  searchOfficialsAction: (...args: unknown[]) => searchOfficialsActionMock(...args),
  getOfficialProfileAction: (...args: unknown[]) => getOfficialProfileActionMock(...args),
}));

vi.mock('@/app/app/associados/[id]/actions', () => ({
  addDependentAction: (...args: unknown[]) => addDependentActionMock(...args),
  editDependentAction: vi.fn(),
  removeDependentAction: (...args: unknown[]) => removeDependentActionMock(...args),
  addHealthAgreementAction: vi.fn(),
  editHealthAgreementAction: vi.fn(),
  removeHealthAgreementAction: vi.fn(),
}));

vi.mock('@/app/app/secretaria/oficios/actions', () => ({
  getOfficialLettersAction: (...args: unknown[]) => getOfficialLettersActionMock(...args),
  getOfficialLetterAction: (...args: unknown[]) => getOfficialLetterActionMock(...args),
  generateAiTextAction: (...args: unknown[]) => generateAiTextActionMock(...args),
  sendForSignatureAction: (...args: unknown[]) => sendForSignatureActionMock(...args),
  cancelOfficialLetterAction: (...args: unknown[]) => cancelOfficialLetterActionMock(...args),
}));

vi.mock('@/app/app/secretaria/mala-direta/actions', () => ({
  countMalaDiretaAudienceAction: (...args: unknown[]) => countMalaDiretaAudienceActionMock(...args),
}));

vi.mock('@/app/app/secretaria/emails/gerar/actions', () => ({
  generateEmailAction: (...args: unknown[]) => generateEmailActionMock(...args),
}));

vi.mock('@/lib/webmcp/download-csv', () => ({
  downloadAuthenticatedCsv: (...args: unknown[]) => downloadAuthenticatedCsvMock(...args),
}));

function toolByName(name: string, officialId = 9) {
  const router = { push: vi.fn(), refresh: vi.fn() };
  const tool = buildSecretariaTools(router, { officialId }).find((item) => item.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return { tool, router };
}

describe('buildSecretariaTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the human create-official form', async () => {
    const { tool, router } = toolByName('start-create-official');
    const result = await tool.execute({}, { signal: new AbortController().signal });
    expect(router.push).toHaveBeenCalledWith('/app/associados/novo');
    expect(JSON.stringify(result)).toContain('/app/associados/novo');
  });

  it('calls global search with the query string', async () => {
    globalSearchActionMock.mockResolvedValue({ associates: [], activities: [] });
    const { tool } = toolByName('global-search');
    await tool.execute({ q: 'Ana' }, { signal: new AbortController().signal });
    expect(globalSearchActionMock).toHaveBeenCalledWith('Ana');
  });

  it('searches officials with cadastro filters', async () => {
    searchOfficialsActionMock.mockResolvedValue({ rows: [], total: 0, page: 1 });
    const { tool } = toolByName('search-officials');
    await tool.execute(
      { q: 'Ana', searchBy: 'name', associationStatus: 'associado' },
      { signal: new AbortController().signal },
    );
    expect(searchOfficialsActionMock).toHaveBeenCalledWith({
      q: 'Ana',
      searchBy: 'name',
      contributionStatus: undefined,
      functionalStatus: undefined,
      associationStatus: 'associado',
      location: undefined,
      page: 1,
    });
  });

  it('cancels an oficio and refreshes the UI', async () => {
    cancelOfficialLetterActionMock.mockResolvedValue({ success: true, data: { id: 3 } });
    const { tool, router } = toolByName('cancel-official-letter');
    await tool.execute({ id: 3 }, { signal: new AbortController().signal });
    expect(cancelOfficialLetterActionMock).toHaveBeenCalledWith(3);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('surfaces AI generation errors', async () => {
    generateEmailActionMock.mockResolvedValue({
      success: false,
      error: 'A chave da API Gemini não está configurada.',
    });
    const { tool } = toolByName('generate-institutional-email');
    const result = await tool.execute(
      { emailType: 'comunicado', prompt: 'Convite da assembleia' },
      { signal: new AbortController().signal },
    );
    expect(generateEmailActionMock).toHaveBeenCalledWith('comunicado', 'Convite da assembleia');
    expect(JSON.stringify(result)).toContain('Erro: A chave da API Gemini não está configurada.');
  });

  it('adds a dependent through the existing form action', async () => {
    addDependentActionMock.mockResolvedValue(undefined);
    const { tool, router } = toolByName('add-dependent');
    await tool.execute(
      { associateId: 9, name: 'Pedro', relationship: 'filho' },
      { signal: new AbortController().signal },
    );
    expect(addDependentActionMock).toHaveBeenCalledTimes(1);
    const formData = addDependentActionMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get('associateId')).toBe('9');
    expect(formData.get('name')).toBe('Pedro');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('rejects overlay writes for a different official than the open ficha', async () => {
    const { tool } = toolByName('add-dependent', 15);
    const result = await tool.execute(
      { associateId: 99, name: 'Pedro', relationship: 'filho' },
      { signal: new AbortController().signal },
    );
    expect(addDependentActionMock).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).toContain('oficial 15');
  });

  it('marks cancel and remove tools as destructive', () => {
    expect(toolByName('cancel-official-letter').tool.annotations).toMatchObject({
      destructiveHint: true,
    });
    expect(toolByName('remove-dependent').tool.annotations).toMatchObject({
      destructiveHint: true,
    });
    expect(toolByName('remove-health-agreement').tool.annotations).toMatchObject({
      destructiveHint: true,
    });
  });

  it('reports CSV export failures from the download response', async () => {
    downloadAuthenticatedCsvMock.mockResolvedValue({
      ok: false,
      status: 429,
      message: 'Muitas exportações. Aguarde um minuto e tente de novo.',
    });
    const { tool } = toolByName('export-gmail-contacts-csv');
    const result = await tool.execute({}, { signal: new AbortController().signal });
    expect(JSON.stringify(result)).toContain('Erro: Muitas exportações');
  });
});
