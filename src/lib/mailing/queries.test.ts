/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAudience, listCampaignRecipients } from './queries';

const { dbMock, encryptPiiMock, decryptPiiFieldMock } = vi.hoisted(() => {
  let _selectResult: any[] = [];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.leftJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockReturnValue(selectChain);
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    _selectChain: selectChain,
    setSelectResult(val: any[]) {
      _selectResult = val;
    },
  };

  const encryptPiiMock = vi.fn((value: string) => `enc:${value}`);
  const decryptPiiFieldMock = vi.fn(
    (ciphertext: string | null, plaintext: string | null): string | null =>
      ciphertext ? `DEC:${ciphertext}` : (plaintext ?? null),
  );

  return { dbMock, encryptPiiMock, decryptPiiFieldMock };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: encryptPiiMock,
  decryptPiiField: decryptPiiFieldMock,
}));

describe('fetchAudience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reusa o ciphertext do cadastro sem re-cifrar', async () => {
    dbMock.setSelectResult([
      {
        id: 1,
        fullName: 'Ana',
        primaryEmail: 'ana@asof.org.br',
        primaryEmailCiphertext: 'ct:ana@asof.org.br',
      },
    ]);

    await expect(fetchAudience({ associationStatus: 'associado' }, 'email', 10)).resolves.toEqual([
      { associateId: 1, name: 'Ana', emailCiphertext: 'ct:ana@asof.org.br' },
    ]);
    expect(encryptPiiMock).not.toHaveBeenCalled();
    expect(decryptPiiFieldMock).not.toHaveBeenCalled();
  });

  it('cifra plaintext legado uma vez no snapshot', async () => {
    dbMock.setSelectResult([
      {
        id: 2,
        fullName: 'Beto',
        primaryEmail: 'beto@asof.org.br',
        primaryEmailCiphertext: null,
      },
    ]);

    await expect(fetchAudience({}, 'email', 10)).resolves.toEqual([
      { associateId: 2, name: 'Beto', emailCiphertext: 'enc:beto@asof.org.br' },
    ]);
    expect(encryptPiiMock).toHaveBeenCalledTimes(1);
    expect(encryptPiiMock).toHaveBeenCalledWith('beto@asof.org.br');
    expect(decryptPiiFieldMock).not.toHaveBeenCalled();
  });

  it('não cifra e-mail no canal de etiquetas', async () => {
    dbMock.setSelectResult([
      {
        id: 3,
        fullName: 'Carla',
        primaryEmail: 'carla@asof.org.br',
        primaryEmailCiphertext: 'ct:carla@asof.org.br',
      },
    ]);

    await expect(fetchAudience({}, 'etiquetas', 10)).resolves.toEqual([
      { associateId: 3, name: 'Carla', emailCiphertext: null },
    ]);
    expect(encryptPiiMock).not.toHaveBeenCalled();
    expect(decryptPiiFieldMock).not.toHaveBeenCalled();
  });
});

describe('listCampaignRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não descriptografa e-mails da lista de destinatários', async () => {
    dbMock.setSelectResult([
      {
        id: 11,
        associateId: 1,
        name: 'Ana',
        status: 'pendente',
        attempts: 0,
        lastError: 'sem_destinatario',
        sentAt: null,
      },
    ]);

    await expect(listCampaignRecipients(9)).resolves.toEqual([
      {
        id: 11,
        associateId: 1,
        name: 'Ana',
        status: 'pendente',
        attempts: 0,
        lastError: 'sem_destinatario',
        sentAt: null,
      },
    ]);
    expect(decryptPiiFieldMock).not.toHaveBeenCalled();
  });
});
