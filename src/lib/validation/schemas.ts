import { z } from 'zod';
import { LEGAL_CONSULTATION_STATUSES } from '@/lib/juridico/status';
import { EMAIL_TRIAGE_STATUSES } from '@/lib/email-triage/status';
import { paymentStatus } from '@/lib/db/schema/finance';
import {
  functionalStatus,
  associationStatus,
  contributionStatus,
  sex,
  maritalStatus,
  missionType,
  careerOrigin,
} from '@/lib/db/schema/associates';
import { paymentMethod } from '@/lib/db/schema/enums';
import { domainEventType } from '@/lib/db/schema/integrations';

export const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^198\.18\./,
  /^198\.19\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^(22[4-9]|23\d)\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'E-mail é obrigatório.')
  .email('E-mail inválido.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
    newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória.'),
  })
  .refine(passwordMatchRefine, {
    message: 'A confirmação não confere.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório.'),
    newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória.'),
  })
  .refine(passwordMatchRefine, {
    message: 'A confirmação não confere.',
    path: ['confirmPassword'],
  });

export const associateSearchParamsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  searchBy: z.enum(['name', 'cpf', 'siape']).optional(),
  contributionStatus: z.enum(contributionStatus.enumValues).optional(),
  functionalStatus: z.enum(functionalStatus.enumValues).optional(),
  associationStatus: z.enum(associationStatus.enumValues).optional(),
});

export const monthlyPaymentsSearchParamsSchema = z.object({
  q: z.string().optional(),
  status: z.enum(paymentStatus.enumValues).optional(),
  method: z.enum(['folha', 'boleto', 'pix', 'transferencia', 'outros']).optional(),
  location: z.enum(['brasil', 'exterior']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const juridicoConsultationsSearchParamsSchema = z.object({
  q: z.string().optional(),
  status: z.enum(LEGAL_CONSULTATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const validFunctionalStatuses = functionalStatus.enumValues;
const validAssociationStatuses = associationStatus.enumValues;
const validContributionStatuses = contributionStatus.enumValues;

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

function passwordMatchRefine(data: { newPassword: string; confirmPassword: string }) {
  return data.newPassword === data.confirmPassword;
}

export function isPublicWebhookUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return false;
  }

  if (
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd')
  ) {
    return false;
  }

  return !PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname));
}

// ─── Year/Month Validation (Finance) ──────────────────────────────────

export const yearSchema = z
  .number({ message: 'Ano inválido.' })
  .int('Ano inválido.')
  .min(2000, 'Ano inválido.')
  .max(2100, 'Ano inválido.');

export const monthSchema = z
  .number({ message: 'Mês inválido.' })
  .int('Mês inválido.')
  .min(1, 'Mês inválido.')
  .max(12, 'Mês inválido.');

export const yearMonthObjectSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

const validSexValues = sex.enumValues;
const validMaritalStatusValues = maritalStatus.enumValues;
const validMissionTypeValues = missionType.enumValues;
const validCareerOriginValues = careerOrigin.enumValues;
const validPaymentMethodValues = paymentMethod.enumValues;

export const updateAssociateSchema = z.object({
  id: z.coerce.number().int().positive('ID do associado inválido.'),
  fullName: z.string().min(1, 'O nome completo é obrigatório.').trim(),
  cpf: z.string().trim().nullable().refine(cpfValidator, 'CPF em formato inválido.').optional(),
  rg: z.string().trim().nullable().optional(),
  rgIssuer: z.string().trim().nullable().optional(),
  rgState: z.string().trim().max(2, 'UF deve ter 2 caracteres.').nullable().optional(),
  rgExpeditionDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de expedição do RG inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  siape: z
    .string()
    .trim()
    .nullable()
    .refine((v) => !v || /^\d{6,10}$/.test(v.replace(/\D/g, '')), 'SIAPE em formato inválido.')
    .optional(),
  sex: z.enum(validSexValues).nullable().or(z.literal('')).optional(),
  maritalStatus: z.enum(validMaritalStatusValues).nullable().or(z.literal('')).optional(),
  birthDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de nascimento inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  birthCity: z.string().trim().nullable().optional(),
  birthState: z.string().trim().max(2, 'UF deve ter 2 caracteres.').nullable().optional(),
  primaryEmail: z
    .string()
    .trim()
    .email('E-mail principal inválido.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  secondaryEmail: z
    .string()
    .trim()
    .email('E-mail alternativo inválido.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  phone: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  neighborhood: z.string().trim().nullable().optional(),
  addressState: z.string().trim().max(2, 'UF deve ter 2 caracteres.').nullable().optional(),
  zipCode: z.string().trim().nullable().optional(),
  locationCity: z.string().trim().nullable().optional(),
  locationCountry: z.string().trim().nullable().optional(),
  assignment: z.string().trim().nullable().optional(),
  assignmentStartDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de lotação inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  classPattern: z.string().trim().nullable().optional(),
  associationCategory: z.string().trim().nullable().optional(),
  functionalStatus: z.enum(validFunctionalStatuses).nullable().or(z.literal('')).optional(),
  associationStatus: z.enum(validAssociationStatuses).nullable().optional(),
  contributionStatus: z.enum(validContributionStatuses).nullable().optional(),
  paymentMethod: z.enum(validPaymentMethodValues).nullable().or(z.literal('')).optional(),
  missionType: z.enum(validMissionTypeValues).nullable().or(z.literal('')).optional(),
  careerOrigin: z.enum(validCareerOriginValues).nullable().or(z.literal('')).optional(),
  admissionDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de admissão inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  inaugurationDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de posse inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  cancellationDate: z
    .string()
    .trim()
    .refine(isValidDateString, 'Data de cancelamento inválida.')
    .nullable()
    .or(z.literal(''))
    .optional(),
  ceocMember: z
    .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal(''), z.null()])
    .transform((v) => (v === '' ? null : v === 'true' ? true : v === 'false' ? false : v === null ? null : v))
    .nullable()
    .default(null),
  caocMember: z
    .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal(''), z.null()])
    .transform((v) => (v === '' ? null : v === 'true' ? true : v === 'false' ? false : v === null ? null : v))
    .nullable()
    .default(null),
  internalNotes: z.string().trim().nullable().optional(),
});

// ─── Dependent & Health Agreement Schemas ────────────────────────────────

export const createDependentSchema = z.object({
  associateId: z.coerce.number().int().positive('ID do associado inválido.'),
  name: z.string().trim().min(1, 'Nome do dependente é obrigatório.').max(200),
  relationship: z.string().trim().min(1, 'Parentesco é obrigatório.').max(100),
});

export const updateDependentSchema = z.object({
  id: z.coerce.number().int().positive('ID do dependente inválido.'),
  name: z.string().trim().min(1, 'Nome do dependente é obrigatório.').max(200).optional(),
  relationship: z.string().trim().min(1, 'Parentesco é obrigatório.').max(100).optional(),
});

export const deleteDependentSchema = z.object({
  id: z.coerce.number().int().positive('ID do dependente inválido.'),
});

export const createHealthAgreementSchema = z.object({
  associateId: z.coerce.number().int().positive('ID do associado inválido.'),
  provider: z.string().trim().min(1, 'Convênio é obrigatório.').max(200),
  startDate: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data de início inválida.')
    .nullable()
    .optional(),
  endDate: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data de término inválida.')
    .nullable()
    .optional(),
});

export const updateHealthAgreementSchema = z.object({
  id: z.coerce.number().int().positive('ID do convênio inválido.'),
  provider: z.string().trim().min(1, 'Convênio é obrigatório.').max(200).optional(),
  startDate: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data de início inválida.')
    .nullable()
    .optional(),
  endDate: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data de término inválida.')
    .nullable()
    .optional(),
});

export const deleteHealthAgreementSchema = z.object({
  id: z.coerce.number().int().positive('ID do convênio inválido.'),
});

export const validEntityTypes = ['consultation', 'process'] as const;

export const createConsultationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório.').trim(),
  questionSummary: z.string().min(1, 'Resumo da pergunta é obrigatório.').trim(),
  questionFullText: z.string().trim().optional(),
  associateId: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
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

export const webhookSecretSchema = z
  .string()
  .min(32, 'O segredo HMAC deve ter pelo menos 32 caracteres.')
  .max(500, 'O segredo HMAC deve ter no máximo 500 caracteres.')
  .regex(
    /^[\x21-\x7E]+$/,
    'O segredo HMAC deve usar apenas caracteres ASCII imprimíveis, sem espaços.',
  );

export const webhookSubscriptionFormSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(120),
  targetUrl: z.string().trim().url('URL de destino inválida.').refine(isPublicWebhookUrl, {
    message:
      'A URL deve usar HTTPS público; hosts locais, privados ou reservados não são permitidos.',
  }),
  subscribedEvents: z
    .array(z.enum(domainEventType.enumValues))
    .min(1, 'Selecione ao menos um evento.'),
});

// ─── Email Triage Validation ─────────────────────────────────────────

export const updateTriageStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(EMAIL_TRIAGE_STATUSES),
  observacoes: z.string().max(2000).optional(),
});

export const addTriageObservacaoSchema = z.object({
  id: z.coerce.number().int().positive(),
  observacoes: z.string().min(1, 'Observação é obrigatória.').max(2000),
});

export const updateTriageDeadlineSchema = z.object({
  id: z.coerce.number().int().positive(),
  prazoData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  prazoHora: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato esperado: HH:mm')
    .optional(),
});
