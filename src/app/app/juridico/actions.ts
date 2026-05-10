'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { legalConsultationStatus } from '@/lib/db/schema';
import {
  updateConsultationStatus as repoUpdateStatus,
  insertNote,
  touchConsultationInteraction,
} from '@/lib/juridico/repository';
import { createConsultationService } from '@/lib/juridico/service';

/**
 * Cria uma nova consulta jurídica com número interno sequencial.
 * @param formData - Dados do formulário
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function createConsultation(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const questionSummary = String(formData.get('questionSummary') ?? '').trim();
  const questionFullText = String(formData.get('questionFullText') ?? '').trim() || null;
  const associateIdRaw = formData.get('associateId');
  const associateId = associateIdRaw ? Number(associateIdRaw) : null;
  const slaDaysRaw = formData.get('slaDays');
  const slaDays = slaDaysRaw ? Number(slaDaysRaw) : 7;
  const createdBy = Number(formData.get('createdBy'));

  const inserted = await createConsultationService({
    title,
    questionSummary,
    questionFullText,
    associateId,
    slaDays,
    createdBy,
  });

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');

  redirect(`/app/juridico/consultas/${inserted.id}`);
}

/**
 * Atualiza o status de uma consulta e gerencia timestamps relacionados.
 * @param id - ID da consulta
 * @param status - Novo status
 */
export async function updateConsultationStatus(id: number, status: string) {
  const validStatus = legalConsultationStatus.enumValues.includes(status as typeof legalConsultationStatus.enumValues[number])
    ? (status as typeof legalConsultationStatus.enumValues[number])
    : 'aberta';

  const lastInteractionAt = validStatus === 'respondida' ? new Date() : undefined;

  await repoUpdateStatus(id, validStatus, lastInteractionAt);

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${id}`);
}

/**
 * Wrapper para updateConsultationStatus que recebe FormData.
 * @param formData - Dados do formulário (id, status)
 * @throws Error se ID ou status estiverem ausentes
 */
export async function updateConsultationStatusFromForm(formData: FormData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') ?? '');
  if (!id || Number.isNaN(id)) {
    throw new Error('ID da consulta inválido.');
  }
  if (!status) {
    throw new Error('O novo status é obrigatório.');
  }
  await updateConsultationStatus(id, status);
}

/**
 * Adiciona uma nota a uma entidade e atualiza o timestamp de interação.
 * @param formData - Dados do formulário
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function addNote(formData: FormData) {
  const entityType = String(formData.get('entityType') ?? '');
  const entityId = Number(formData.get('entityId'));
  const content = String(formData.get('content') ?? '').trim();
  const createdBy = Number(formData.get('createdBy'));
  const isEscritorioResponse = formData.get('isEscritorioResponse') === 'true';

  if (!entityType) {
    throw new Error('O tipo de entidade é obrigatório.');
  }
  if (!entityId || Number.isNaN(entityId)) {
    throw new Error('ID da entidade inválido.');
  }
  if (!content) {
    throw new Error('O conteúdo da nota é obrigatório.');
  }
  if (!createdBy || Number.isNaN(createdBy)) {
    throw new Error('Usuário criador inválido.');
  }

  await insertNote({
    entityType,
    entityId,
    content,
    createdBy,
    isEscritorioResponse,
  });

  if (entityType === 'consultation') {
    await touchConsultationInteraction(entityId);
  }

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${entityId}`);
}
