import { z } from 'zod';

export const officialLetterFormSchema = z.object({
  recipient: z.string().min(1, 'O destinatário é obrigatório.').trim(),
  recipientRole: z.string().min(1, 'O cargo do destinatário é obrigatório.').trim(),
  vocativo: z.string().min(1, 'O vocativo é obrigatório.').trim(),
  letterDate: z.string().min(1, 'A data é obrigatória.').trim(),
  subject: z.string().min(1, 'O assunto é obrigatório.').trim(),
  itamaratySector: z.string().min(1, 'O setor no Itamaraty é obrigatório.').trim(),
  signatoryName: z.string().min(1, 'O nome do signatário é obrigatório.').trim(),
  signatoryRole: z.string().min(1, 'O cargo do signatário é obrigatório.').trim(),
  closure: z.enum(['Atenciosamente,', 'Respeitosamente,'], {
    message: 'Selecione um fecho válido.',
  }),
  bodyRichText: z.string().min(1, 'O corpo do ofício é obrigatório.'),
  bodyPlainText: z.string().min(1, 'O conteúdo em texto simples é obrigatório.'),
});

export type OfficialLetterFormValues = z.infer<typeof officialLetterFormSchema>;
