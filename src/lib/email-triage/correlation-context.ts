import type { CorrelationContext } from './correlate';
import { extractSenderEmailForCorrelation } from './address';
import { findAssociateByPrimaryEmailHash } from '@/lib/associates/repository';
import { getOpenConsultationsByAssociate } from '@/lib/juridico/repository';
import { piiBlindIndex } from '@/lib/crypto/pii';

/**
 * Build correlation context for an email payload.
 *
 * Extracts the sender email, looks up the associated associate via blind index,
 * and fetches open legal consultations for that associate.
 */
export async function buildCorrelationContext(payload: { sender: string }): Promise<CorrelationContext> {
  const senderEmail = await extractSenderEmailForCorrelation(payload.sender);
  if (!senderEmail) return { associate: null, consultations: [] };

  const emailHash = piiBlindIndex(senderEmail);
  const associate = await findAssociateByPrimaryEmailHash(emailHash);
  if (!associate) return { associate: null, consultations: [] };

  const consultations = await getOpenConsultationsByAssociate(associate.id);
  return { associate: { id: associate.id }, consultations };
}
