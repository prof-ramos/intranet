import { encryptPii, piiBlindIndex } from '@/lib/crypto/pii';
import type { UpdateAssociateValues } from './repository';

/**
 * Descriptor for a PII field triple: plaintext, ciphertext, hash.
 * Used by buildPiiPatch to produce the correct UpdateAssociateValues entries.
 */
interface PiiFieldDescriptor {
  /** Base field name in UpdateAssociateInput (e.g. 'cpf') */
  name: keyof PiiInputShape;
  /** Plaintext column in UpdateAssociateValues (e.g. 'cpf') */
  plaintextCol: PiiPatchKeys;
  /** Ciphertext column in UpdateAssociateValues (e.g. 'cpfCiphertext') */
  ciphertextCol: PiiPatchKeys;
  /** Hash/blind-index column in UpdateAssociateValues (e.g. 'cpfHash') */
  hashCol: PiiPatchKeys;
}

/**
 * Keys produced by buildPiiPatch.
 */
type PiiPatchKeys =
  | 'cpf'
  | 'cpfCiphertext'
  | 'cpfHash'
  | 'siape'
  | 'siapeCiphertext'
  | 'siapeHash'
  | 'primaryEmail'
  | 'primaryEmailCiphertext'
  | 'primaryEmailHash'
  | 'phone'
  | 'phoneCiphertext'
  | 'phoneHash'
  | 'whatsapp'
  | 'whatsappCiphertext'
  | 'whatsappHash'
  | 'address'
  | 'addressCiphertext'
  | 'addressHash';

/**
 * Subset of UpdateAssociateInput containing only PII fields.
 */
type PiiInputShape = Pick<
  UpdateAssociateValues,
  'cpf' | 'siape' | 'primaryEmail' | 'phone' | 'whatsapp' | 'address'
>;

/**
 * Registry of all PII fields that follow the standard encryption pattern.
 * Adding a new encrypted field is a one-line change here.
 */
const PII_FIELDS: PiiFieldDescriptor[] = [
  { name: 'cpf', plaintextCol: 'cpf', ciphertextCol: 'cpfCiphertext', hashCol: 'cpfHash' },
  { name: 'siape', plaintextCol: 'siape', ciphertextCol: 'siapeCiphertext', hashCol: 'siapeHash' },
  {
    name: 'primaryEmail',
    plaintextCol: 'primaryEmail',
    ciphertextCol: 'primaryEmailCiphertext',
    hashCol: 'primaryEmailHash',
  },
  { name: 'phone', plaintextCol: 'phone', ciphertextCol: 'phoneCiphertext', hashCol: 'phoneHash' },
  {
    name: 'whatsapp',
    plaintextCol: 'whatsapp',
    ciphertextCol: 'whatsappCiphertext',
    hashCol: 'whatsappHash',
  },
  {
    name: 'address',
    plaintextCol: 'address',
    ciphertextCol: 'addressCiphertext',
    hashCol: 'addressHash',
  },
];

/**
 * Build the PII portion of an UpdateAssociateValues patch from user input.
 *
 * For each registered PII field:
 * - If the input field is defined (including null), the plaintext column is set to null.
 * - If the input field is a string (including empty), ciphertext is encrypted and hash is blind-indexed.
 * - If the input field is explicitly null, ciphertext and hash are set to null.
 * - If the input field is undefined, all three columns are omitted (undefined).
 *
 * This centralises the F-008 rule (no plaintext PII writes) in one place.
 */
export function buildPiiPatch(input: Partial<PiiInputShape>): Pick<
  UpdateAssociateValues,
  PiiPatchKeys
> {
  const patch: Record<string, string | null | undefined> = {};

  for (const field of PII_FIELDS) {
    const value = input[field.name];

    if (value === undefined) {
      // Field not present in input — set columns to undefined so the repository layer ignores them
      patch[field.plaintextCol] = undefined;
      patch[field.ciphertextCol] = undefined;
      patch[field.hashCol] = undefined;
      continue;
    }

    // F-008: never write plaintext PII; set legacy column to null
    patch[field.plaintextCol] = null;

    if (value === null) {
      // Explicitly clearing the field
      patch[field.ciphertextCol] = null;
      patch[field.hashCol] = null;
    } else {
      // String value (including empty): encrypt and index
      patch[field.ciphertextCol] = encryptPii(value);
      patch[field.hashCol] = piiBlindIndex(value);
    }
  }

  return patch as ReturnType<typeof buildPiiPatch>;
}

/**
 * Re-export for consumers that need the field list dynamically (e.g. schema validation,
 * bulk import, or audit logging).
 */
export { PII_FIELDS };
export type { PiiFieldDescriptor };
