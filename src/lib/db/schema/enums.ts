import { pgEnum } from 'drizzle-orm/pg-core';

/** Payment method for monthly contributions — shared by associates and finance. */
export const paymentMethod = pgEnum('payment_method', [
  'folha',
  'boleto',
  'pix',
  'transferencia',
  'outros',
]);

/** Satisfaction rating for legal consultations and processes — shared by legal-consultations and legal-processes. */
export const legalSatisfaction = pgEnum('legal_satisfaction', [
  'satisfeito',
  'insatisfeito',
  'sem_resposta',
]);
