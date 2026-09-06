import { describe, expect, it } from 'vitest';
import { resolveTerminalCampaignStatus } from './repository';

describe('resolveTerminalCampaignStatus', () => {
  it('não fecha enquanto houver pendentes ou enviando', () => {
    expect(resolveTerminalCampaignStatus({ sent: 2, failed: 1, pending: 1 })).toBeNull();
  });

  it('marca falhou quando todos os destinatários falharam', () => {
    expect(resolveTerminalCampaignStatus({ sent: 0, failed: 4, pending: 0 })).toBe('falhou');
  });

  it('marca concluída quando há ao menos um envio', () => {
    expect(resolveTerminalCampaignStatus({ sent: 1, failed: 3, pending: 0 })).toBe('concluida');
  });

  it('marca concluída quando não restam destinatários ativos', () => {
    expect(resolveTerminalCampaignStatus({ sent: 0, failed: 0, pending: 0 })).toBe('concluida');
  });
});
