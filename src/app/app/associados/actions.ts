'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';

function cleanString(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  return str || null;
}

function cleanDate(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim();
  if (!str) return null;
  // Aceita YYYY-MM-DD e verifica se a data é real
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return str;
}

function isValidEmail(value: string | null): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCPF(cpf: string | null): boolean {
  if (!cpf) return true;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[10])) return false;

  return true;
}

function validateSIAPE(siape: string | null): boolean {
  if (!siape) return true;
  const digits = siape.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 10;
}

/**
 * Atualiza os dados editáveis de um associado.
 * Apenas admin e diretoria podem executar esta ação.
 */
export async function updateAssociate(formData: FormData) {
  await requireRole(['admin', 'diretoria']);

  const id = Number(formData.get('id'));
  if (id == null || Number.isNaN(Number(id)) || Number(id) <= 0) {
    throw new Error('ID do associado inválido.');
  }

  const fullName = cleanString(formData.get('fullName'));
  if (!fullName) {
    throw new Error('O nome completo é obrigatório.');
  }

  const cpf = cleanString(formData.get('cpf'));
  const siape = cleanString(formData.get('siape'));

  if (!validateCPF(cpf)) {
    throw new Error('O CPF informado está em formato inválido.');
  }
  if (!validateSIAPE(siape)) {
    throw new Error('O SIAPE informado está em formato inválido.');
  }

  const primaryEmail = cleanString(formData.get('primaryEmail'));
  const secondaryEmail = cleanString(formData.get('secondaryEmail'));

  if (!isValidEmail(primaryEmail)) {
    throw new Error('O e-mail principal está em formato inválido.');
  }
  if (!isValidEmail(secondaryEmail)) {
    throw new Error('O e-mail alternativo está em formato inválido.');
  }

  const phone = cleanString(formData.get('phone'));
  const whatsapp = cleanString(formData.get('whatsapp'));
  const birthDate = cleanDate(formData.get('birthDate'));
  const address = cleanString(formData.get('address'));
  const locationCity = cleanString(formData.get('locationCity'));
  const locationCountry = cleanString(formData.get('locationCountry'));
  const assignment = cleanString(formData.get('assignment'));
  const assignmentStartDate = cleanDate(formData.get('assignmentStartDate'));
  const classPattern = cleanString(formData.get('classPattern'));
  const associationCategory = cleanString(formData.get('associationCategory'));

  const functionalStatus = cleanString(formData.get('functionalStatus'));
  const associationStatus = cleanString(formData.get('associationStatus'));
  const contributionStatus = cleanString(formData.get('contributionStatus'));

  const validFunctionalStatuses = ['ativo', 'aposentado', 'cedido', 'em_licenca'] as const;
  const validAssociationStatuses = ['ativo', 'inativo'] as const;
  const validContributionStatuses = ['em_dia', 'inadimplente', 'pendente_migracao'] as const;

  if (functionalStatus && !validFunctionalStatuses.includes(functionalStatus as typeof validFunctionalStatuses[number])) {
    throw new Error(`Situação funcional inválida: "${functionalStatus}".`);
  }
  if (associationStatus && !validAssociationStatuses.includes(associationStatus as typeof validAssociationStatuses[number])) {
    throw new Error(`Situação associativa inválida: "${associationStatus}".`);
  }
  if (contributionStatus && !validContributionStatuses.includes(contributionStatus as typeof validContributionStatuses[number])) {
    throw new Error(`Status de contribuição inválido: "${contributionStatus}".`);
  }

  const set: Record<string, unknown> = {
    fullName,
    cpf,
    siape,
    primaryEmail,
    secondaryEmail,
    phone,
    whatsapp,
    birthDate,
    address,
    locationCity,
    locationCountry,
    assignment,
    assignmentStartDate,
    classPattern,
    associationCategory,
    updatedAt: new Date(),
  };

  if (functionalStatus) {
    set.functionalStatus = functionalStatus;
  }
  if (associationStatus) {
    set.associationStatus = associationStatus;
  }
  if (contributionStatus) {
    set.contributionStatus = contributionStatus;
  }

  try {
    await db.update(associates).set(set).where(eq(associates.id, id));
  } catch (err) {
    console.error('[updateAssociate] DB error for id:', id, err);
    throw new Error('Falha ao atualizar o associado. Tente novamente.');
  }

  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${id}`);

  redirect(`/app/associados/${id}`);
}
