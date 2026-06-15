#!/usr/bin/env npx tsx
/**
 * Legacy data import script for migration 0020+.
 *
 * Reads the ASOF legacy JSON export, transforms rows using pure functions
 * from migrate-legacy-transforms.ts, encrypts PII fields, and upserts
 * into the associates/dependents/health_agreements tables.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy.ts --dry-run
 *   npx tsx scripts/migrate-legacy.ts --dry-run --limit 10
 *   npx tsx scripts/migrate-legacy.ts --limit 100 --verbose
 *   npx tsx scripts/migrate-legacy.ts --source path/to/data.json
 *
 * Environment:
 *   DATABASE_URL or DATABASE_MIGRATION_URL — required for non-dry-run
 *   ENCRYPTION_MASTER_KEY — required for PII encryption
 */

import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';
import { associates, dependents, healthAgreements } from '@/lib/db/schema';
import { encryptPii, piiBlindIndex } from '@/lib/crypto/pii';
import { normalizeCountryLabel } from '@/lib/associates/location-country';
import { eq } from 'drizzle-orm';
import {
  type LegacyRecord,
  type Dependent,
  type CpfResult,
  nullIfEmpty,
  parseDate,
  mapSex,
  mapMaritalStatus,
  mapMissionType,
  mapCareerOrigin,
  mapAssociationStatus,
  mapUfWithAcSentinel,
  mapBoolean,
  normalizeCpf,
  normalizeSiape,
  normalizePhone,
  normalizeCep,
  parseDependents,
  parseConvenios,
  mapFunctionalStatus,
  transformLegacyRecord,
} from './migrate-legacy-transforms';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
  verbose: boolean;
  source: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    limit: (() => {
      const idx = args.indexOf('--limit');
      return idx >= 0 && args[idx + 1] ? parseInt(args[idx + 1], 10) : null;
    })(),
    verbose: args.includes('--verbose'),
    source: (() => {
      const idx = args.indexOf('--source');
      return idx >= 0 && args[idx + 1] ? args[idx + 1] : 'data/asof-prod-dump/chancelaria_web_full.json';
    })(),
  };
}

// ---------------------------------------------------------------------------
// PII encryption helpers
// ---------------------------------------------------------------------------

/**
 * Encrypt a PII value and return the triple-column values.
 * Plaintext is set to null per PII-first policy (CHECK constraint).
 */
function encryptPiiField(value: string | null): {
  plaintext: null;
  ciphertext: string | null;
  hash: string | null;
} {
  if (value == null || value === '') {
    return { plaintext: null, ciphertext: null, hash: null };
  }
  return {
    plaintext: null,
    ciphertext: encryptPii(value),
    hash: piiBlindIndex(value),
  };
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

interface ImportStats {
  totalRecords: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  dependentsInserted: number;
  healthAgreementsInserted: number;
  cpfStats: {
    valid: number;
    malformed: number;
    wrongLength: number;
    invalidCheckDigits: number;
    nonNumeric: number;
    empty: number;
  };
  acSentinelCount: number;
  warnings: string[];
}

function createEmptyStats(): ImportStats {
  return {
    totalRecords: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    dependentsInserted: 0,
    healthAgreementsInserted: 0,
    cpfStats: { valid: 0, malformed: 0, wrongLength: 0, invalidCheckDigits: 0, nonNumeric: 0, empty: 0 },
    acSentinelCount: 0,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Main import logic
// ---------------------------------------------------------------------------

async function main() {
  const cliArgs = parseArgs();

  console.log('=== ASOF Legacy Data Import ===');
  console.log(`Mode: ${cliArgs.dryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`Source: ${cliArgs.source}`);
  if (cliArgs.limit) console.log(`Limit: ${cliArgs.limit} records`);
  console.log();

  // Validate environment
  if (!cliArgs.dryRun) {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_MIGRATION_URL) {
      console.error('ERROR: DATABASE_URL or DATABASE_MIGRATION_URL must be set for live import.');
      process.exit(1);
    }
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      console.error('ERROR: ENCRYPTION_MASTER_KEY must be set for PII encryption.');
      process.exit(1);
    }
  }

  // Read JSON source
  const sourcePath = path.resolve(cliArgs.source);
  if (!fs.existsSync(sourcePath)) {
    console.error(`ERROR: Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Reading ${sourcePath}...`);
  const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as {
    headers: string[];
    totalRecords: number;
    data: LegacyRecord[];
  };

  let records = rawData.data;
  if (cliArgs.limit) {
    records = records.slice(0, cliArgs.limit);
  }
  console.log(`Processing ${records.length} records (of ${rawData.totalRecords} total)\n`);

  const stats = createEmptyStats();
  stats.totalRecords = records.length;

  // Process each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowIndex = i + 1; // 1-based for sourceRowNumber

    try {
      const transformed = transformLegacyRecord(record, rowIndex);
      stats.warnings.push(...transformed.warnings);

      // Count AC sentinel occurrences
      if (record['UF'] === 'AC') stats.acSentinelCount++;
      if (record['UF_2'] === 'AC') stats.acSentinelCount++;
      if (record['UF_3'] === 'AC') stats.acSentinelCount++;

      // CPF stats
      const cpfResult = normalizeCpf(record['C.P.F.'] ?? '');
      if (cpfResult.issue === 'ok') stats.cpfStats.valid++;
      else if (cpfResult.issue === 'malformed') stats.cpfStats.empty++;
      else if (cpfResult.issue === 'non_numeric') stats.cpfStats.nonNumeric++;
      else if (cpfResult.issue === 'wrong_length') stats.cpfStats.wrongLength++;
      else if (cpfResult.issue === 'invalid_check_digits') stats.cpfStats.invalidCheckDigits++;

      if (cliArgs.dryRun) {
        if (cliArgs.verbose && rowIndex <= 5) {
          console.log(`[DRY] Row ${rowIndex}: ${transformed.associate.fullName ?? '(null)'}`);
        }
        stats.inserted++;
        stats.dependentsInserted += transformed.dependents.length;
        stats.healthAgreementsInserted += transformed.healthAgreements.length;
        continue;
      }

      // --- Live import: encrypt PII and upsert ---
      const associateData = transformed.associate;

      // CPF encryption
      const cpfVal = normalizeCpf(record['C.P.F.'] ?? '');
      const cpfEncrypted = encryptPiiField(cpfVal.digits);
      associateData.cpf = cpfEncrypted.plaintext;
      associateData.cpfCiphertext = cpfEncrypted.ciphertext;
      associateData.cpfHash = cpfEncrypted.hash;

      // SIAPE encryption
      const siapeRaw = normalizeSiape(record['Matrícula SIAPE'] ?? '');
      const siapeEncrypted = encryptPiiField(siapeRaw);
      associateData.siape = siapeEncrypted.plaintext;
      associateData.siapeCiphertext = siapeEncrypted.ciphertext;
      associateData.siapeHash = siapeEncrypted.hash;

      // Email encryption
      const emailRaw = nullIfEmpty(record['E-mail'])?.toLowerCase() ?? null;
      const emailEncrypted = encryptPiiField(emailRaw);
      associateData.primaryEmail = emailEncrypted.plaintext;
      associateData.primaryEmailCiphertext = emailEncrypted.ciphertext;
      associateData.primaryEmailHash = emailEncrypted.hash;

      // Phone encryption
      const phoneRaw = normalizePhone(record['Telefone'] ?? '');
      const phoneEncrypted = encryptPiiField(phoneRaw);
      associateData.phone = phoneEncrypted.plaintext;
      associateData.phoneCiphertext = phoneEncrypted.ciphertext;
      associateData.phoneHash = phoneEncrypted.hash;

      // WhatsApp encryption
      const whatsappRaw = normalizePhone(record['Celular'] ?? '');
      const whatsappEncrypted = encryptPiiField(whatsappRaw);
      associateData.whatsapp = whatsappEncrypted.plaintext;
      associateData.whatsappCiphertext = whatsappEncrypted.ciphertext;
      associateData.whatsappHash = whatsappEncrypted.hash;

      // Address encryption
      const addressRaw = nullIfEmpty(record['Endereço']);
      const addressEncrypted = encryptPiiField(addressRaw);
      associateData.address = addressEncrypted.plaintext;
      associateData.addressCiphertext = addressEncrypted.ciphertext;
      associateData.addressHash = addressEncrypted.hash;

      // RG encryption
      const rgRaw = nullIfEmpty(record['R.G.']);
      const rgEncrypted = encryptPiiField(rgRaw);
      associateData.rg = rgEncrypted.plaintext;
      associateData.rgCiphertext = rgEncrypted.ciphertext;
      associateData.rgHash = rgEncrypted.hash;

      // Country normalization (full)
      const countryRaw = nullIfEmpty(record['País']);
      associateData.locationCountry = countryRaw ? normalizeCountryLabel(countryRaw) : null;

      // Upsert associate
      const existing = await db
        .select({ id: associates.id })
        .from(associates)
        .where(eq(associates.sourceRowNumber, String(rowIndex)))
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(associates)
          .set(associateData as typeof associates.$inferInsert)
          .where(eq(associates.sourceRowNumber, String(rowIndex)));
        stats.updated++;
      } else {
        // Insert
        await db.insert(associates).values(associateData as typeof associates.$inferInsert);
        stats.inserted++;
      }

      // Get the associate ID for child records
      const associateRow = await db
        .select({ id: associates.id })
        .from(associates)
        .where(eq(associates.sourceRowNumber, String(rowIndex)))
        .limit(1);

      if (associateRow.length === 0) {
        stats.errors++;
        stats.warnings.push(`Row ${rowIndex}: Failed to retrieve associate ID after upsert`);
        continue;
      }

      const associateId = associateRow[0].id;

      // Insert dependents (always fresh — delete existing for this associate first)
      if (transformed.dependents.length > 0) {
        await db.delete(dependents).where(eq(dependents.associateId, associateId));
        await db.insert(dependents).values(
          transformed.dependents.map((d: Dependent) => ({
            associateId,
            name: d.name,
            relationship: d.relationship,
          })),
        );
        stats.dependentsInserted += transformed.dependents.length;
      }

      // Insert health agreements (always fresh)
      if (transformed.healthAgreements.length > 0) {
        await db.delete(healthAgreements).where(eq(healthAgreements.associateId, associateId));
        await db.insert(healthAgreements).values(
          transformed.healthAgreements.map((provider: string) => ({
            associateId,
            provider,
          })),
        );
        stats.healthAgreementsInserted += transformed.healthAgreements.length;
      }

      if (cliArgs.verbose && rowIndex % 100 === 0) {
        console.log(`Processed ${rowIndex}/${records.length} records...`);
      }
    } catch (err) {
      stats.errors++;
      const message = err instanceof Error ? err.message : String(err);
      stats.warnings.push(`Row ${rowIndex}: ERROR - ${message}`);
      if (cliArgs.verbose) {
        console.error(`Error processing row ${rowIndex}:`, message);
      }
    }
  }

  // Print summary
  console.log('\n=== Import Summary ===');
  console.log(`Total records: ${stats.totalRecords}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Dependents: ${stats.dependentsInserted}`);
  console.log(`Health agreements: ${stats.healthAgreementsInserted}`);
  console.log(`\nCPF quality:`);
  console.log(`  Valid: ${stats.cpfStats.valid}`);
  console.log(`  Empty/dash: ${stats.cpfStats.empty}`);
  console.log(`  Non-numeric: ${stats.cpfStats.nonNumeric}`);
  console.log(`  Wrong length: ${stats.cpfStats.wrongLength}`);
  console.log(`  Invalid check digits: ${stats.cpfStats.invalidCheckDigits}`);
  console.log(`\nAC sentinel occurrences: ${stats.acSentinelCount}`);
  console.log(`Warnings: ${stats.warnings.length}`);

  if (stats.warnings.length > 0 && cliArgs.verbose) {
    console.log('\nWarnings (first 20):');
    stats.warnings.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
  }

  // Write report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.resolve(`scripts/migration-report-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  if (cliArgs.dryRun) {
    console.log('\n⚠️  DRY RUN — no database writes were performed.');
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});