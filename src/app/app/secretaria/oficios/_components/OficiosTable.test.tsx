/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OficiosTable } from './OficiosTable';

const { markInterruptedMock } = vi.hoisted(() => ({ markInterruptedMock: vi.fn() }));

vi.mock('./SendForSignatureModal', () => ({
  SendForSignatureModal: () => null,
}));

vi.mock('../actions', () => ({
  cancelOfficialLetterAction: vi.fn(),
  markAssinafySubmissionInterruptedAction: (...args: unknown[]) => markInterruptedMock(...args),
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
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('não oferece novo envio quando já existe um estado Assinafy', () => {
    render(<OficiosTable oficios={[oficio]} />);

    expect(screen.queryByRole('button', { name: 'Enviar para assinatura' })).toBeNull();
  });

  it('identifica falha de processamento sem confundi-la com rejeição', () => {
    render(<OficiosTable oficios={[oficio]} />);

    expect(screen.getByText('Falha')).toBeDefined();
    expect(screen.queryByText('Rejeitado')).toBeNull();
  });

  it('expõe a interrupção sem permitir cancelamento ou novo envio enquanto o claim está ativo', () => {
    render(<OficiosTable oficios={[{ ...oficio, assinafyStatus: 'uploading' }]} />);

    expect(screen.getByText('Envio em andamento')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Marcar envio interrompido' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Cancelar ofício' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar para assinatura' })).toBeNull();
  });

  it('exige confirmação e converte o claim interrompido em falha', async () => {
    markInterruptedMock.mockResolvedValue({
      success: true,
      data: { id: oficio.id, assinafyStatus: 'failed' },
    });
    render(<OficiosTable oficios={[{ ...oficio, assinafyStatus: 'uploading' }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar envio interrompido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(markInterruptedMock).toHaveBeenCalledWith(oficio.id));
    expect(await screen.findByText('Falha')).toBeDefined();
    expect(screen.queryByText('Envio em andamento')).toBeNull();
  });

  it('mostra a razão quando o backend recusa um claim ainda recente', async () => {
    markInterruptedMock.mockResolvedValue({
      success: false,
      error: 'Aguarde 10 minutos antes de marcar uma interrupção.',
    });
    render(<OficiosTable oficios={[{ ...oficio, assinafyStatus: 'uploading' }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar envio interrompido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Aguarde 10 minutos');
    expect(screen.getByText('Envio em andamento')).toBeDefined();
  });
});
