import { db, type DbExecutor } from '@/lib/db';
import { documents, admins, type Document, type NewDocument } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface FindDocumentByIdResult extends Omit<Document, 'uploadedBy'> {
  uploadedById: number;
  uploadedByName: string | null;
}

export async function findDocumentById(
  id: number,
  executor: DbExecutor = db,
): Promise<FindDocumentByIdResult | null> {
  const [row] = await executor
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
    .where(eq(documents.id, id))
    .limit(1);

  return row ?? null;
}

export async function insertDocument(
  values: NewDocument,
  executor: DbExecutor = db,
): Promise<{ id: number }> {
  const [inserted] = await executor
    .insert(documents)
    .values(values)
    .returning({ id: documents.id });

  return inserted;
}

export async function updateDocument(
  id: number,
  values: Partial<NewDocument>,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .update(documents)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(documents.id, id));
}

export async function deleteDocument(
  id: number,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.delete(documents).where(eq(documents.id, id));
}
