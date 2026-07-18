/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OficioForm } from './OficioForm';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  generateAiText: vi.fn(),
  saveOfficialLetter: vi.fn(),
  updateOfficialLetter: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('../actions', () => ({
  generateAiTextAction: mocks.generateAiText,
  saveOfficialLetterAction: mocks.saveOfficialLetter,
  updateOfficialLetterAction: mocks.updateOfficialLetter,
}));

const initialData = {
  recipient: 'Ministro das Relações Exteriores',
  recipientRole: 'Ministro de Estado',
  vocativo: 'Senhor Ministro',
  letterDate: '17 de julho de 2026',
  subject: 'Solicitação institucional',
  itamaratySector: 'SGPR / SGP',
  signatoryName: 'Presidente da ASOF',
  signatoryRole: 'Presidente',
  closure: 'Atenciosamente,' as const,
  bodyRichText: '<p>Texto base do ofício.</p>',
  bodyPlainText: 'Texto base do ofício.',
};

function formValue(container: HTMLElement, name: string) {
  return (container.querySelector(`input[name="${name}"]`) as HTMLInputElement).value;
}

describe('OficioForm — auxiliar com IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveOfficialLetter.mockResolvedValue({ success: true });
    mocks.updateOfficialLetter.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('mantém pending e aplica o texto simples e o HTML escapado após sucesso', async () => {
    let resolveGeneration!: (value: { success: true; text: string }) => void;
    mocks.generateAiText.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGeneration = resolve;
      }),
    );
    const { container } = render(<OficioForm initialData={initialData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Auxiliar com IA' }));
    expect(screen.getByRole('textbox', { name: 'Instrução para a IA' })).toHaveProperty(
      'value',
      initialData.bodyPlainText,
    );

    const generateButton = screen.getByRole('button', { name: 'Gerar Sugestão' });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(generateButton.getAttribute('aria-busy')).toBe('true');
      expect(generateButton.textContent).toContain('Gerando');
    });

    await act(async () => {
      resolveGeneration({ success: true, text: 'Sugestão <segura> & formal' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Auxiliar com IA' })).toBeNull();
      expect(formValue(container, 'bodyPlainText')).toBe('Sugestão <segura> & formal');
      expect(formValue(container, 'bodyRichText')).toBe(
        '<p>Sugestão &lt;segura&gt; &amp; formal</p>',
      );
    });
  });

  it('mantém o conteúdo original e apresenta o erro retornado pela action', async () => {
    mocks.generateAiText.mockResolvedValueOnce({
      success: false,
      error: 'Falha controlada ao gerar sugestão.',
    });
    const { container } = render(<OficioForm initialData={initialData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Auxiliar com IA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Sugestão' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Falha controlada ao gerar sugestão.',
    );
    expect(screen.getByRole('dialog', { name: 'Auxiliar com IA' })).toBeDefined();
    expect(formValue(container, 'bodyPlainText')).toBe(initialData.bodyPlainText);
    expect(formValue(container, 'bodyRichText')).toBe(initialData.bodyRichText);
  });
});
