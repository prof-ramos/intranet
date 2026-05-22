/**
 * Backfill script: encrypts plaintext CPF and SIAPE values into ciphertext
 * and HMAC blind index columns for existing associate rows.
 *
 * Idempotent: re-running picks up rows where cpf_ciphertext/siape_ciphertext
 * are still null but cpf/siape have values.
 *
 * Usage:
 *   npx tsx scripts/backfill-pii-encryption.ts
 *
 * Requires ENCRYPTION_MASTER_KEY (or ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY as fallback)
 * and DATABASE_URL to be set in the environment.
 */

import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { encryptV2, blindIndex, hkdfDeriveKey, KEY_CONTEXTS } from '@/lib/crypto';
import { env } from '@/lib/env';
import { isNull, sql } from 'drizzle-orm';

function zeroBuffer(buf: Buffer | undefined) {
  if (buf && Buffer.isBuffer(buf)) {
    buf.fill(0);
  }
}

async function backfill() {
  const masterKey = env.ENCRYPTION_MASTER_KEY ?? env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY or ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY must be set.');
  }

  // Derive keys once for the entire backfill, then zero after use.
  const encryptionKey = hkdfDeriveKey(masterKey, KEY_CONTEXTS.piiEncryption);
  const searchKey = hkdfDeriveKey(masterKey, KEY_CONTEXTS.piiSearch).toString('hex');

  try {
    console.log('Starting PII encryption backfill...');

    // CPF backfill: rows where cpf is set but cpf_ciphertext is null
    const cpfRows = await db
      .select({ id: associates.id, cpf: associates.cpf })
      .from(associates)
      .where(isNull(associates.cpfCiphertext));

    let cpfUpdated = 0;
    for (const row of cpfRows) {
      if (!row.cpf) continue;
      const ciphertext = encryptV2(row.cpf, masterKey, KEY_CONTEXTS.piiEncryption);
      const hash = blindIndex(row.cpf.trim().toLowerCase(), searchKey);
      await db
        .update(associates)
        .set({ cpfCiphertext: ciphertext, cpfHash: hash, updatedAt: new Date() })
        .where(sql`${associates.id} = ${row.id}`);
      cpfUpdated++;
    }
    console.log(`CPF: updated ${cpfUpdated} rows.`);

    // SIAPE backfill: rows where siape is set but siape_ciphertext is null
    const siapeRows = await db
      .select({ id: associates.id, siape: associates.siape })
      .from(associates)
      .where(isNull(associates.siapeCiphertext));

    let siapeUpdated = 0;
    for (const row of siapeRows) {
      if (!row.siape) continue;
      const ciphertext = encryptV2(row.siape, masterKey, KEY_CONTEXTS.piiEncryption);
      const hash = blindIndex(row.siape.trim().toLowerCase(), searchKey);
      await db
        .update(associates)
        .set({ siapeCiphertext: ciphertext, siapeHash: hash, updatedAt: new Date() })
        .where(sql`${associates.id} = ${row.id}`);
      siapeUpdated++;
    }
    console.log(`SIAPE: updated ${siapeUpdated} rows.`);
  } finally {
    zeroBuffer(encryptionKey);
    zeroBuffer(Buffer.from(searchKey, 'hex'));
    console.log('PII encryption backfill complete. Key material zeroed.');
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
