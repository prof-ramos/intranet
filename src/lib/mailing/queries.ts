import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  admins,
  assignments,
  associates,
  mailingCampaigns,
  mailingRecipients,
} from '@/lib/db/schema';
import { decryptPiiField } from '@/lib/crypto/pii';
import { assignmentLocationTypeSql } from '@/lib/associates/location-country';
import type {
  MailingAudienceFilters,
  MailingAudienceMember,
  MailingCampaignDetail,
  MailingCampaignHistoryRow,
  MailingRecipientContext,
  MailingRecipientRow,
  MailingRecipientStatus,
} from './types';

function hasContactSql(channel: 'email' | 'etiquetas'): SQL | undefined {
  if (channel === 'email') {
    return sql`(
      ${associates.primaryEmailCiphertext} is not null
      or (${associates.primaryEmail} is not null and btrim(${associates.primaryEmail}) <> '')
    )`;
  }
  return sql`(
    ${associates.addressCiphertext} is not null
    or (${associates.address} is not null and btrim(${associates.address}) <> '')
  )`;
}

function likeContains(value: string): string {
  return `%${value.replace(/[%_]/g, '')}%`;
}

function audienceConditions(filters: MailingAudienceFilters, channel: 'email' | 'etiquetas') {
  return and(
    filters.associationStatus
      ? eq(associates.associationStatus, filters.associationStatus)
      : undefined,
    filters.functionalStatus
      ? eq(associates.functionalStatus, filters.functionalStatus)
      : undefined,
    filters.contributionStatus
      ? eq(associates.contributionStatus, filters.contributionStatus)
      : undefined,
    filters.location
      ? eq(
          assignmentLocationTypeSql(assignments.type, associates.locationCountry),
          filters.location,
        )
      : undefined,
    filters.associationCategory
      ? sql`lower(btrim(${associates.associationCategory})) = ${filters.associationCategory.toLocaleLowerCase('pt-BR')}`
      : undefined,
    filters.assignment ? ilike(associates.assignment, likeContains(filters.assignment)) : undefined,
    hasContactSql(channel),
  );
}

export async function countAudience(
  filters: MailingAudienceFilters,
  channel: 'email' | 'etiquetas',
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(associates)
    .leftJoin(assignments, eq(assignments.name, associates.assignment))
    .where(audienceConditions(filters, channel));
  return row?.total ?? 0;
}

export async function fetchAudience(
  filters: MailingAudienceFilters,
  channel: 'email' | 'etiquetas',
  limit: number,
): Promise<MailingAudienceMember[]> {
  if (limit <= 0) return [];
  const rows = await db
    .select({
      id: associates.id,
      fullName: associates.fullName,
      primaryEmail: associates.primaryEmail,
      primaryEmailCiphertext: associates.primaryEmailCiphertext,
    })
    .from(associates)
    .leftJoin(assignments, eq(assignments.name, associates.assignment))
    .where(audienceConditions(filters, channel))
    .orderBy(asc(associates.fullName), asc(associates.id))
    .limit(limit);

  return rows.map((row) => ({
    associateId: row.id,
    name: row.fullName,
    email: decryptPiiField(row.primaryEmailCiphertext, row.primaryEmail),
  }));
}

export async function listCampaigns(limit = 50): Promise<MailingCampaignHistoryRow[]> {
  const rows = await db
    .select({
      id: mailingCampaigns.id,
      name: mailingCampaigns.name,
      channel: mailingCampaigns.channel,
      status: mailingCampaigns.status,
      subject: mailingCampaigns.subject,
      recipientCount: mailingCampaigns.recipientCount,
      sentCount: mailingCampaigns.sentCount,
      failedCount: mailingCampaigns.failedCount,
      createdAt: mailingCampaigns.createdAt,
      startedAt: mailingCampaigns.startedAt,
      completedAt: mailingCampaigns.completedAt,
      createdByName: admins.name,
    })
    .from(mailingCampaigns)
    .leftJoin(admins, eq(admins.id, mailingCampaigns.createdBy))
    .orderBy(desc(mailingCampaigns.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    channel: row.channel,
    status: row.status,
    subject: row.subject,
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  }));
}

export async function getCampaignDetail(id: number): Promise<MailingCampaignDetail | null> {
  const [campaign] = await db
    .select({
      id: mailingCampaigns.id,
      name: mailingCampaigns.name,
      channel: mailingCampaigns.channel,
      status: mailingCampaigns.status,
      subject: mailingCampaigns.subject,
      templateBody: mailingCampaigns.templateBody,
      filters: mailingCampaigns.filters,
      recipientCount: mailingCampaigns.recipientCount,
      sentCount: mailingCampaigns.sentCount,
      failedCount: mailingCampaigns.failedCount,
      createdAt: mailingCampaigns.createdAt,
      startedAt: mailingCampaigns.startedAt,
      completedAt: mailingCampaigns.completedAt,
      createdByName: admins.name,
    })
    .from(mailingCampaigns)
    .leftJoin(admins, eq(admins.id, mailingCampaigns.createdBy))
    .where(eq(mailingCampaigns.id, id));

  if (!campaign) return null;

  const statusRows = await db
    .select({ status: mailingRecipients.status, total: count() })
    .from(mailingRecipients)
    .where(eq(mailingRecipients.campaignId, id))
    .groupBy(mailingRecipients.status);

  const recipientTotals: MailingCampaignDetail['recipientTotals'] = {
    pendente: 0,
    enviando: 0,
    enviado: 0,
    falhou: 0,
    cancelado: 0,
  };
  for (const row of statusRows) {
    recipientTotals[row.status] = row.total;
  }

  return {
    ...campaign,
    recipientTotals,
    createdByName: campaign.createdByName ?? null,
    createdAt: campaign.createdAt,
    startedAt: campaign.startedAt,
    completedAt: campaign.completedAt,
  };
}

export async function getCampaignAssociateIds(campaignId: number): Promise<number[]> {
  const rows = await db
    .select({ associateId: mailingRecipients.associateId })
    .from(mailingRecipients)
    .where(eq(mailingRecipients.campaignId, campaignId));
  return rows
    .map((row) => row.associateId)
    .filter((associateId): associateId is number => associateId !== null);
}

export async function getMailingRecipientContexts(
  ids: number[],
): Promise<MailingRecipientContext[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: associates.id,
      fullName: associates.fullName,
      siape: associates.siape,
      siapeCiphertext: associates.siapeCiphertext,
      primaryEmail: associates.primaryEmail,
      primaryEmailCiphertext: associates.primaryEmailCiphertext,
      phone: associates.phone,
      phoneCiphertext: associates.phoneCiphertext,
      address: associates.address,
      addressCiphertext: associates.addressCiphertext,
      associationCategory: associates.associationCategory,
      associationStatus: associates.associationStatus,
      assignment: associates.assignment,
      classPattern: associates.classPattern,
      locationCity: associates.locationCity,
      addressState: associates.addressState,
      neighborhood: associates.neighborhood,
      zipCode: associates.zipCode,
    })
    .from(associates)
    .where(inArray(associates.id, ids))
    .orderBy(asc(associates.fullName), asc(associates.id));

  return rows.map((row) => ({
    associateId: row.id,
    nome: row.fullName,
    matricula: decryptPiiField(row.siapeCiphertext, row.siape),
    categoria: row.associationCategory,
    situacaoAssociativa: row.associationStatus,
    lotacao: row.assignment,
    padrao: row.classPattern,
    enderecoCompleto: decryptPiiField(row.addressCiphertext, row.address),
    bairro: row.neighborhood,
    cidade: row.locationCity,
    uf: row.addressState,
    cep: row.zipCode,
    email: decryptPiiField(row.primaryEmailCiphertext, row.primaryEmail),
    telefone: decryptPiiField(row.phoneCiphertext, row.phone),
  }));
}

export async function listCampaignRecipients(campaignId: number): Promise<MailingRecipientRow[]> {
  const rows = await db
    .select({
      id: mailingRecipients.id,
      associateId: mailingRecipients.associateId,
      name: mailingRecipients.recipientName,
      emailCiphertext: mailingRecipients.emailCiphertext,
      status: mailingRecipients.status,
      attempts: mailingRecipients.attempts,
      lastError: mailingRecipients.lastError,
      sentAt: mailingRecipients.sentAt,
    })
    .from(mailingRecipients)
    .where(eq(mailingRecipients.campaignId, campaignId))
    .orderBy(asc(mailingRecipients.id));

  return rows.map((row) => ({
    id: row.id,
    associateId: row.associateId,
    name: row.name,
    email: row.emailCiphertext ? decryptPiiField(row.emailCiphertext, null) : null,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    sentAt: row.sentAt,
  }));
}

export type { MailingRecipientStatus };
