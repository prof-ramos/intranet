import { describe, it, expect } from 'vitest';
import { officialLetterFormSchema } from '@/lib/oficios/validations';

describe('officialLetterFormSchema', () => {
  const validData = {
    recipient: 'Diretoria',
    recipientRole: 'Diretor',
    vocativo: 'Prezado',
    letterDate: '2024-01-15',
    subject: 'Assunto do ofício',
    itamaratySector: 'DEC',
    signatoryName: 'João Silva',
    signatoryRole: 'Chefe de Gabinete',
    closure: 'Atenciosamente,' as const,
    bodyRichText: '<p>Corpo do ofício</p>',
    bodyPlainText: 'Corpo do ofício',
  };

  it('validates correct data', () => {
    const result = officialLetterFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty required fields', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      recipient: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only required fields', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      subject: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects rich-text html without visible text', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      bodyRichText: '<p><br></p>',
      bodyPlainText: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('accepts rich-text html with formatting tags', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      bodyRichText: '<p><strong>Corpo</strong> do <em>ofício</em></p><ul><li>Item</li></ul>',
      bodyPlainText: 'Corpo do ofício\nItem',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid closure enum values', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      closure: 'InvalidClosure',
    });
    expect(result.success).toBe(false);
  });

  it('accepts both valid closure values', () => {
    const result1 = officialLetterFormSchema.safeParse({
      ...validData,
      closure: 'Atenciosamente,',
    });
    const result2 = officialLetterFormSchema.safeParse({
      ...validData,
      closure: 'Respeitosamente,',
    });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('trims whitespace on string fields', () => {
    const result = officialLetterFormSchema.safeParse({
      ...validData,
      recipient: '  Diretoria  ',
      subject: '  Assunto  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipient).toBe('Diretoria');
      expect(result.data.subject).toBe('Assunto');
    }
  });

  it('rejects missing required fields', () => {
    const missing = { ...validData } as Record<string, unknown>;
    delete missing.recipient;
    const result = officialLetterFormSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });
});
