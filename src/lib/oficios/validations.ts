import { z } from 'zod';

function htmlHasText(value: string) {
  return (
    value
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length > 0
  );
}

export const officialLetterFormSchema = z.object({
  recipient: z.string().trim().min(1, 'O destinatário é obrigatório.'),
  recipientRole: z.string().trim().min(1, 'O cargo do destinatário é obrigatório.'),
  vocativo: z.string().trim().min(1, 'O vocativo é obrigatório.'),
  letterDate: z.string().trim().min(1, 'A data é obrigatória.'),
  subject: z.string().trim().min(1, 'O assunto é obrigatório.'),
  itamaratySector: z.string().trim().min(1, 'O setor no Itamaraty é obrigatório.'),
  signatoryName: z.string().trim().min(1, 'O nome do signatário é obrigatório.'),
  signatoryRole: z.string().trim().min(1, 'O cargo do signatário é obrigatório.'),
  closure: z.enum(['Atenciosamente,', 'Respeitosamente,'], {
    message: 'Selecione um fecho válido.',
  }),
  bodyRichText: z
    .string()
    .min(1, 'O corpo do ofício é obrigatório.')
    .refine(htmlHasText, 'O corpo do ofício é obrigatório.'),
  bodyPlainText: z.string().trim().min(1, 'O conteúdo em texto simples é obrigatório.'),
});

export type OfficialLetterFormValues = z.infer<typeof officialLetterFormSchema>;
