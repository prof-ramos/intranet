import { z } from 'zod';
import { LEGAL_CONSULTATION_STATUSES } from '@/lib/juridico/status';

export const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório.').email('E-mail inválido.').toLowerCase().trim(),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'A confirmação não confere.',
  path: ['confirmPassword'],
});

export const associateSearchParamsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const validFunctionalStatuses = ['ativo', 'aposentado', 'cedido', 'em_licenca'] as const;
const validAssociationStatuses = ['ativo', 'inativo'] as const;
const validContributionStatuses = ['em_dia', 'inadimplente', 'pendente_migracao'] as const;

function isValidDateString(value: string | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function cpfValidator(cpf: string | null) {
  if (!cpf) return true;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (new Set(digits).size === 1) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(digits[10]);
}

export const updateAssociateSchema = z.object({
  id: z.coerce.number().int().positive('ID do associado inválido.'),
  fullName: z.string().min(1, 'O nome completo é obrigatório.').trim(),
  cpf: z.string().trim().nullable().refine(cpfValidator, 'CPF em formato inválido.').optional(),
  siape: z.string().trim().nullable().refine((v) => !v || /^\d{6,10}$/.test(v.replace(/\D/g, '')), 'SIAPE em formato inválido.').optional(),
  primaryEmail: z.string().trim().email('E-mail principal inválido.').nullable().or(z.literal('')).optional(),
  secondaryEmail: z.string().trim().email('E-mail alternativo inválido.').nullable().or(z.literal('')).optional(),
  phone: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  birthDate: z.string().trim().refine(isValidDateString, 'Data de nascimento inválida.').nullable().or(z.literal('')).optional(),
  address: z.string().trim().nullable().optional(),
  locationCity: z.string().trim().nullable().optional(),
  locationCountry: z.string().trim().nullable().optional(),
  assignment: z.string().trim().nullable().optional(),
  assignmentStartDate: z.string().trim().refine(isValidDateString, 'Data de lotação inválida.').nullable().or(z.literal('')).optional(),
  classPattern: z.string().trim().nullable().optional(),
  associationCategory: z.string().trim().nullable().optional(),
  functionalStatus: z.enum(validFunctionalStatuses).nullable().optional(),
  associationStatus: z.enum(validAssociationStatuses).nullable().optional(),
  contributionStatus: z.enum(validContributionStatuses).nullable().optional(),
  internalNotes: z.string().trim().nullable().optional(),
});

export const validEntityTypes = ['consultation', 'process'] as const;

export const createConsultationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório.').trim(),
  questionSummary: z.string().min(1, 'Resumo da pergunta é obrigatório.').trim(),
  questionFullText: z.string().trim().optional(),
  associateId: z.coerce.number().int().positive().optional(),
  slaDays: z.coerce.number().int().min(1).default(7),
});

export const updateConsultationStatusSchema = z.object({
  id: z.coerce.number().int().positive('ID da consulta inválido.'),
  status: z.enum(LEGAL_CONSULTATION_STATUSES),
});

export const addNoteSchema = z.object({
  entityType: z.enum(validEntityTypes, { message: 'Tipo de entidade inválido.' }),
  entityId: z.coerce.number().int().positive('ID da entidade inválido.'),
  content: z.string().min(1, 'Conteúdo da nota é obrigatório.').trim(),
  isEscritorioResponse: z.boolean().default(false),
});
