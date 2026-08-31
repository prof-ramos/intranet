import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, operatorMcpTokens } from '@/lib/db/schema';
import type { AuthRole } from '@/lib/auth/config';
import { logAuditAction } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';

export const TOKEN_PREFIX = 'asof_mcp_';
export const DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;
const logger = createLogger('mcp');

export interface OperatorMcpPrincipal {
  userId: number;
  role: AuthRole;
  tokenId: number;
  name: string;
}

export interface CreateOperatorMcpTokenInput {
  adminId: number;
  name: string;
  lgpdAcknowledged: true;
  expiresAt?: Date;
}

export interface OperatorMcpTokenListItem {
  id: number;
  adminId: number;
  adminName: string;
  name: string;
  lgpdAcknowledgedAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export function hashMcpToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function validateName(name: string): string {
  const normalized = name.trim();
  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error('O nome do token deve ter entre 2 e 80 caracteres.');
  }
  return normalized;
}

function assertPositiveId(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} inválido.`);
  }
}

export async function createOperatorMcpToken(input: CreateOperatorMcpTokenInput) {
  assertPositiveId(input.adminId, 'Administrador');
  if (!input.lgpdAcknowledged) {
    throw new Error('É necessário confirmar a ciência sobre o tratamento de dados via MCP.');
  }

  const name = validateName(input.name);
  const now = new Date();
  const expiresAt = input.expiresAt ?? new Date(now.getTime() + DEFAULT_TTL_MS);
  if (expiresAt <= now) {
    throw new Error('A expiração do token deve estar no futuro.');
  }
  if (expiresAt.getTime() > now.getTime() + DEFAULT_TTL_MS) {
    throw new Error('A expiração do token não pode exceder 90 dias.');
  }

  const rawValue = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString('base64url')}`;
  const tokenHash = hashMcpToken(rawValue);

  const row = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(operatorMcpTokens)
      .values({
        adminId: input.adminId,
        name,
        tokenHash,
        lgpdAcknowledgedAt: now,
        expiresAt,
      })
      .returning({
        id: operatorMcpTokens.id,
        name: operatorMcpTokens.name,
        expiresAt: operatorMcpTokens.expiresAt,
        createdAt: operatorMcpTokens.createdAt,
      });

    await logAuditAction({
      adminId: input.adminId,
      action: 'mcp_token_created',
      entityType: 'admin',
      entityId: input.adminId,
      metadata: { channel: 'mcp', tokenId: created.id },
      executor: tx,
    });

    return created;
  });

  return { ...row, token: rawValue };
}

export async function listOperatorMcpTokens({
  adminId,
  includeAll = false,
}: {
  adminId: number;
  includeAll?: boolean;
}): Promise<OperatorMcpTokenListItem[]> {
  assertPositiveId(adminId, 'Administrador');

  let canListAll = false;
  if (includeAll) {
    const [actor] = await db
      .select({ role: admins.role, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.id, adminId))
      .limit(1);
    canListAll = actor?.isActive === true && actor.role === 'admin';
  }

  return db
    .select({
      id: operatorMcpTokens.id,
      adminId: operatorMcpTokens.adminId,
      adminName: admins.name,
      name: operatorMcpTokens.name,
      lgpdAcknowledgedAt: operatorMcpTokens.lgpdAcknowledgedAt,
      lastUsedAt: operatorMcpTokens.lastUsedAt,
      expiresAt: operatorMcpTokens.expiresAt,
      revokedAt: operatorMcpTokens.revokedAt,
      createdAt: operatorMcpTokens.createdAt,
    })
    .from(operatorMcpTokens)
    .innerJoin(admins, eq(admins.id, operatorMcpTokens.adminId))
    .where(canListAll ? undefined : eq(operatorMcpTokens.adminId, adminId))
    .orderBy(desc(operatorMcpTokens.createdAt));
}

export async function revokeOperatorMcpToken({
  id,
  actorId,
}: {
  id: number;
  actorId: number;
  actorRole: AuthRole;
}): Promise<boolean> {
  assertPositiveId(id, 'Token');
  assertPositiveId(actorId, 'Ator');

  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ role: admins.role, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.id, actorId))
      .limit(1);

    const [token] = await tx
      .select({ adminId: operatorMcpTokens.adminId })
      .from(operatorMcpTokens)
      .where(and(eq(operatorMcpTokens.id, id), isNull(operatorMcpTokens.revokedAt)))
      .limit(1);

    if (!actor?.isActive || !token || (actor.role !== 'admin' && token.adminId !== actorId)) {
      return false;
    }

    const [updated] = await tx
      .update(operatorMcpTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(operatorMcpTokens.id, id), isNull(operatorMcpTokens.revokedAt)))
      .returning({ id: operatorMcpTokens.id });

    if (!updated) return false;

    await logAuditAction({
      adminId: actorId,
      action: 'mcp_token_revoked',
      entityType: 'admin',
      entityId: token.adminId,
      metadata: { channel: 'mcp', tokenId: id },
      executor: tx,
    });
    return true;
  });
}

export async function verifyOperatorMcpToken(
  rawToken: string,
): Promise<OperatorMcpPrincipal | null> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

  const now = new Date();
  const [row] = await db
    .select({
      userId: admins.id,
      role: admins.role,
      isActive: admins.isActive,
      passwordChangeRequired: admins.mustChangePassword,
      tokenId: operatorMcpTokens.id,
      name: operatorMcpTokens.name,
      lastUsedAt: operatorMcpTokens.lastUsedAt,
    })
    .from(operatorMcpTokens)
    .innerJoin(admins, eq(admins.id, operatorMcpTokens.adminId))
    .where(
      and(
        eq(operatorMcpTokens.tokenHash, hashMcpToken(rawToken)),
        isNull(operatorMcpTokens.revokedAt),
        gt(operatorMcpTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row || !row.isActive || row.passwordChangeRequired) return null;

  const lastUsedCutoff = new Date(now.getTime() - LAST_USED_THROTTLE_MS);
  if (!row.lastUsedAt || row.lastUsedAt < lastUsedCutoff) {
    try {
      await db
        .update(operatorMcpTokens)
        .set({ lastUsedAt: now })
        .where(
          and(
            eq(operatorMcpTokens.id, row.tokenId),
            or(
              isNull(operatorMcpTokens.lastUsedAt),
              lt(operatorMcpTokens.lastUsedAt, lastUsedCutoff),
            ),
          ),
        );
    } catch (error) {
      logger.warn(
        'Não foi possível atualizar o último uso do token MCP.',
        { tokenId: row.tokenId },
        error as Error,
      );
    }
  }

  return {
    userId: row.userId,
    role: row.role,
    tokenId: row.tokenId,
    name: row.name,
  };
}
