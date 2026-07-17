/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OficiosTable } from './OficiosTable';

vi.mock('./SendForSignatureModal', () => ({
  SendForSignatureModal: () => null,
}));

vi.mock('../actions', () => ({
  cancelOfficialLetterAction: vi.fn(),
}));

const oficio = {
  id: 1,
  number: '001/2026',
  status: 'gerado',
  recipient: 'Ministério das Relações Exteriores',
  letterDate: '17/07/2026',
  subject: 'Assunto institucional',
  signatoryName: 'MARIA SILVA — Presidente',
  assinafyDocumentId: null,
  assinafyStatus: 'failed',
  assinafySigningUrl: null,
};

describe('OficiosTable', () => {
  afterEach(() => cleanup());

  it('não oferece novo envio quando já existe um estado Assinafy', () => {
    render(<OficiosTable oficios={[oficio]} />);

    expect(screen.queryByRole('button', { name: 'Enviar para assinatura' })).toBeNull();
  });

  it('identifica falha de processamento sem confundi-la com rejeição', () => {
    render(<OficiosTable oficios={[oficio]} />);

    expect(screen.getByText('Falha')).toBeDefined();
    expect(screen.queryByText('Rejeitado')).toBeNull();
  });
});
