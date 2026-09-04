import { describe, expect, it } from 'vitest';
import { createMailingCampaignSchema, mailingAudienceFiltersSchema } from './validations';

describe('mailingAudienceFiltersSchema', () => {
  it('aceita filtros vazios', () => {
    expect(mailingAudienceFiltersSchema.safeParse({}).success).toBe(true);
  });

  it('aceita filtros válidos', () => {
    const result = mailingAudienceFiltersSchema.safeParse({
      associationStatus: 'associado',
      functionalStatus: 'ativo',
      contributionStatus: 'em_dia',
      location: 'exterior',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita chaves desconhecidas', () => {
    const result = mailingAudienceFiltersSchema.safeParse({ q: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejeita valores fora do enum', () => {
    const result = mailingAudienceFiltersSchema.safeParse({ location: 'lua' });
    expect(result.success).toBe(false);
  });
});

describe('createMailingCampaignSchema', () => {
  const base = {
    name: 'Campanha de teste',
    channel: 'email' as const,
    subject: 'Assunto',
    templateBody: 'Olá {{nome}}',
    filters: { associationStatus: 'associado' as const },
  };

  it('exige assunto no canal de e-mail', () => {
    const result = createMailingCampaignSchema.safeParse({ ...base, subject: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'subject')).toBe(true);
    }
  });

  it('dispensa assunto no canal de etiquetas', () => {
    const result = createMailingCampaignSchema.safeParse({
      ...base,
      channel: 'etiquetas',
      subject: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('exige corpo do template', () => {
    const result = createMailingCampaignSchema.safeParse({ ...base, templateBody: '' });
    expect(result.success).toBe(false);
  });

  it('exige nome com tamanho mínimo', () => {
    const result = createMailingCampaignSchema.safeParse({ ...base, name: 'ab' });
    expect(result.success).toBe(false);
  });
});
