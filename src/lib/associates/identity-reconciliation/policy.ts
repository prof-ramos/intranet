import { createHash } from 'node:crypto';
import type { Associate } from '@/lib/db/schema/associates';

export type AssociateIdentitySnapshot = Omit<
  Associate,
  'sourceRowNumber' | 'sourcePayload' | 'numberOfDependents' | 'updatedAt'
>;

export interface RelationshipSnapshot {
  activities: Array<{ id: number }>;
  monthlyPayments: Array<{ id: number; year: number; month: number }>;
  legalConsultations: Array<{ id: number }>;
  legalProcesses: Array<{ id: number }>;
  dependents: Array<{ id: number }>;
  healthAgreements: Array<{ id: number }>;
}

export type RelationshipName = keyof RelationshipSnapshot;

export type ConflictCode =
  | 'CADASTRAL_FIELD_CONFLICT'
  | 'IDENTIFIER_CONFLICT'
  | 'MONTHLY_PAYMENT_PERIOD_CONFLICT'
  | 'NORMALIZED_NAME_CONFLICT';

export interface SafeReconciliationComponent {
  associateIds: number[];
  canonicalId: number;
  absorbedIds: number[];
  eligible: boolean;
  relationCounts: Record<RelationshipName, number>;
  conflictCodes: ConflictCode[];
}

export interface SafeReconciliationReport {
  version: 1;
  summary: {
    componentCount: number;
    eligibleCount: number;
    ambiguousCount: number;
    associateCount: number;
  };
  components: SafeReconciliationComponent[];
  globalConflictCodes: Array<'UNKNOWN_ASSOCIATE_FOREIGN_KEY'>;
  evidenceHash: string;
}

export interface ReconciliationPlan {
  report: SafeReconciliationReport;
  canApply: boolean;
  /** Private execution data. It must never cross the command's output seam. */
  executionComponents: Array<{
    canonical: AssociateIdentitySnapshot;
    absorbed: AssociateIdentitySnapshot[];
  }>;
}

const IDENTIFIER_KEYS = ['cpfHash', 'siapeHash', 'primaryEmailHash'] as const;

const SCALAR_KEYS = [
  'functionalStatus',
  'assignment',
  'assignmentStartDate',
  'locationCity',
  'locationCountry',
  'associationStatus',
  'joinedAt',
  'associationCategory',
  'contributionStatus',
  'paymentMethod',
  'secondaryEmail',
  'internalNotes',
  'sex',
  'maritalStatus',
  'birthCity',
  'birthState',
  'rgIssuer',
  'rgState',
  'rgExpeditionDate',
  'addressState',
  'neighborhood',
  'zipCode',
  'missionType',
  'careerOrigin',
  'admissionDate',
  'inaugurationDate',
  'retirementDate',
  'cancellationDate',
  'leaveDate',
  'ceocMember',
  'caocMember',
  'birthDate',
  'classPattern',
] as const satisfies ReadonlyArray<keyof AssociateIdentitySnapshot>;

const PII_GROUPS = [
  ['cpf', 'cpfCiphertext', 'cpfHash'],
  ['primaryEmail', 'primaryEmailCiphertext', 'primaryEmailHash'],
  ['phone', 'phoneCiphertext', 'phoneHash'],
  ['address', 'addressCiphertext', 'addressHash'],
  ['whatsapp', 'whatsappCiphertext', 'whatsappHash'],
  ['siape', 'siapeCiphertext', 'siapeHash'],
  ['rg', 'rgCiphertext', 'rgHash'],
] as const;

export type CanonicalPatch = Partial<
  Pick<
    AssociateIdentitySnapshot,
    (typeof SCALAR_KEYS)[number] | (typeof PII_GROUPS)[number][number]
  >
>;

function setCanonicalPatchValue<K extends keyof CanonicalPatch>(
  patch: CanonicalPatch,
  key: K,
  value: CanonicalPatch[K],
): void {
  patch[key] = value;
}

const RELATIONSHIP_NAMES: RelationshipName[] = [
  'activities',
  'monthlyPayments',
  'legalConsultations',
  'legalProcesses',
  'dependents',
  'healthAgreements',
];

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(',')}}`;
}

function completeness(associate: AssociateIdentitySnapshot): number {
  let score = 1; // fullName is always present.
  for (const key of SCALAR_KEYS) if (associate[key] !== null) score += 1;
  for (const group of PII_GROUPS) {
    if (group.some((key) => associate[key] !== null)) score += 1;
  }
  return score;
}

function hasCadastralConflict(rows: AssociateIdentitySnapshot[]): boolean {
  for (const key of SCALAR_KEYS) {
    const values = new Set(rows.map((row) => row[key]).filter((value) => value !== null));
    if (values.size > 1) return true;
  }

  for (const [plaintextKey, ciphertextKey, hashKey] of PII_GROUPS) {
    const populated = rows.filter(
      (row) => row[plaintextKey] !== null || row[ciphertextKey] !== null || row[hashKey] !== null,
    );
    if (populated.length < 2) continue;
    const hashes = new Set(populated.map((row) => row[hashKey]).filter(Boolean));
    if (hashes.size > 1 || populated.some((row) => row[hashKey] === null)) return true;
  }
  return false;
}

function connectedComponents(rows: AssociateIdentitySnapshot[]): AssociateIdentitySnapshot[][] {
  const parent = new Map(rows.map((row) => [row.id, row.id]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const firstByIdentifier = new Map<string, number>();

  const find = (id: number): number => {
    const current = parent.get(id)!;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot)
      parent.set(Math.max(leftRoot, rightRoot), Math.min(leftRoot, rightRoot));
  };

  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    for (const key of IDENTIFIER_KEYS) {
      const value = row[key];
      if (value === null) continue;
      const identity = `${key}:${value}`;
      const first = firstByIdentifier.get(identity);
      if (first === undefined) firstByIdentifier.set(identity, row.id);
      else union(first, row.id);
    }
  }

  const groups = new Map<number, AssociateIdentitySnapshot[]>();
  for (const id of [...byId.keys()].sort((a, b) => a - b)) {
    const root = find(id);
    const group = groups.get(root) ?? [];
    group.push(byId.get(id)!);
    groups.set(root, group);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function buildReconciliationPlan(input: {
  associates: AssociateIdentitySnapshot[];
  relationships: Map<number, RelationshipSnapshot>;
  unknownForeignKeys: string[];
}): ReconciliationPlan {
  const components = connectedComponents(input.associates)
    .map((rows) => [...rows].sort((a, b) => a.id - b.id))
    .sort((left, right) => left[0].id - right[0].id);

  const safeComponents: SafeReconciliationComponent[] = [];
  const executionComponents: ReconciliationPlan['executionComponents'] = [];

  for (const rows of components) {
    const conflicts = new Set<ConflictCode>();
    if (new Set(rows.map((row) => normalizedName(row.fullName))).size > 1) {
      conflicts.add('NORMALIZED_NAME_CONFLICT');
    }
    if (
      IDENTIFIER_KEYS.some(
        (key) => new Set(rows.map((row) => row[key]).filter((value) => value !== null)).size > 1,
      )
    ) {
      conflicts.add('IDENTIFIER_CONFLICT');
    }
    if (hasCadastralConflict(rows)) conflicts.add('CADASTRAL_FIELD_CONFLICT');

    const periods = new Set<string>();
    for (const row of rows) {
      for (const payment of input.relationships.get(row.id)?.monthlyPayments ?? []) {
        const period = `${payment.year}-${payment.month}`;
        if (periods.has(period)) conflicts.add('MONTHLY_PAYMENT_PERIOD_CONFLICT');
        periods.add(period);
      }
    }

    const ranked = [...rows].sort((left, right) => {
      const leftRelationships = input.relationships.get(left.id) ?? emptyRelationships();
      const rightRelationships = input.relationships.get(right.id) ?? emptyRelationships();
      const leftScore =
        completeness(left) +
        RELATIONSHIP_NAMES.reduce((sum, key) => sum + leftRelationships[key].length, 0);
      const rightScore =
        completeness(right) +
        RELATIONSHIP_NAMES.reduce((sum, key) => sum + rightRelationships[key].length, 0);
      return (
        rightScore - leftScore ||
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id - right.id
      );
    });
    const canonical = ranked[0];
    const absorbed = rows.filter((row) => row.id !== canonical.id);
    const combinedCounts = RELATIONSHIP_NAMES.reduce(
      (counts, name) => {
        counts[name] = rows.reduce(
          (sum, row) => sum + (input.relationships.get(row.id)?.[name].length ?? 0),
          0,
        );
        return counts;
      },
      {} as Record<RelationshipName, number>,
    );

    safeComponents.push({
      associateIds: rows.map((row) => row.id),
      canonicalId: canonical.id,
      absorbedIds: absorbed.map((row) => row.id),
      eligible: conflicts.size === 0 && input.unknownForeignKeys.length === 0,
      relationCounts: combinedCounts,
      conflictCodes: [...conflicts].sort(),
    });
    executionComponents.push({ canonical, absorbed });
  }

  const globalConflictCodes: SafeReconciliationReport['globalConflictCodes'] =
    input.unknownForeignKeys.length > 0 ? ['UNKNOWN_ASSOCIATE_FOREIGN_KEY'] : [];
  const privateEvidence = {
    associates: components.flat().map((row) => row),
    relationships: components.flatMap((rows) =>
      rows.map((row) => ({
        associateId: row.id,
        relationships: Object.fromEntries(
          RELATIONSHIP_NAMES.map((name) => [
            name,
            [...(input.relationships.get(row.id)?.[name] ?? [])].sort(
              (left, right) => left.id - right.id,
            ),
          ]),
        ),
      })),
    ),
    foreignKeyInventory: [...input.unknownForeignKeys].sort(),
  };
  const evidenceHash = createHash('sha256').update(canonicalJson(privateEvidence)).digest('hex');
  const eligibleCount = safeComponents.filter((component) => component.eligible).length;
  const report: SafeReconciliationReport = {
    version: 1,
    summary: {
      componentCount: safeComponents.length,
      eligibleCount,
      ambiguousCount: safeComponents.length - eligibleCount,
      associateCount: safeComponents.reduce(
        (sum, component) => sum + component.associateIds.length,
        0,
      ),
    },
    components: safeComponents,
    globalConflictCodes,
    evidenceHash,
  };
  return {
    report,
    canApply:
      globalConflictCodes.length === 0 && safeComponents.every((component) => component.eligible),
    executionComponents,
  };
}

export function emptyRelationships(): RelationshipSnapshot {
  return {
    activities: [],
    monthlyPayments: [],
    legalConsultations: [],
    legalProcesses: [],
    dependents: [],
    healthAgreements: [],
  };
}

export function buildCanonicalPatch(
  canonical: AssociateIdentitySnapshot,
  absorbed: AssociateIdentitySnapshot[],
): CanonicalPatch {
  const patch: CanonicalPatch = {};
  for (const key of SCALAR_KEYS) {
    if (canonical[key] !== null) continue;
    const value = absorbed.map((row) => row[key]).find((candidate) => candidate !== null);
    if (value !== undefined) setCanonicalPatchValue(patch, key, value);
  }

  for (const [plaintextKey, ciphertextKey, hashKey] of PII_GROUPS) {
    const canonicalHasRepresentation =
      canonical[plaintextKey] !== null || canonical[ciphertextKey] !== null;
    const source =
      absorbed.find((row) => row[plaintextKey] !== null || row[ciphertextKey] !== null) ??
      absorbed.find((row) => row[hashKey] !== null);
    if (!source) continue;

    if (!canonicalHasRepresentation) {
      if (source[plaintextKey] !== null) {
        setCanonicalPatchValue(patch, plaintextKey, source[plaintextKey]);
      } else if (source[ciphertextKey] !== null) {
        setCanonicalPatchValue(patch, ciphertextKey, source[ciphertextKey]);
      }
    }
    if (canonical[hashKey] === null && source[hashKey] !== null) {
      setCanonicalPatchValue(patch, hashKey, source[hashKey]);
    }
  }
  return patch;
}
