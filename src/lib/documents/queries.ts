import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, admins } from '@/lib/db/schema';
import type { Document } from '@/lib/db/schema';

export interface DocumentFilters {
  category?: Document['category'];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentWithUploader extends Omit<Document, 'uploadedBy'> {
  uploadedBy: {
    id: number;
    name: string;
  };
}

export async function getDocuments(filters: DocumentFilters = {}): Promise<DocumentWithUploader[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  const conditions = [];

  if (filters.category) {
    conditions.push(eq(documents.category, filters.category));
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(documents.name, searchPattern),
        ilike(documents.description, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      description: documents.description,
      category: documents.category,
      storagePath: documents.storagePath,
      fileSize: documents.fileSize,
      fileType: documents.fileType,
      uploadedById: documents.uploadedBy,
      uploadedByName: admins.name,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .leftJoin(admins, eq(documents.uploadedBy, admins.id))
    .where(whereClause)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    storagePath: row.storagePath,
    fileSize: row.fileSize,
    fileType: row.fileType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    uploadedBy: {
      id: row.uploadedById,
      name: row.uploadedByName ?? 'Administrador',
    },
  }));
}

export async function getDocumentById(id: number): Promise<Document | null> {
  const rows = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return rows[0] ?? null;
}
