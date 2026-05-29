import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import type { Document } from '@/lib/db/schema';

export interface CreateDocumentInput {
  name: string;
  description: string | null;
  category: Document['category'];
  storagePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: number;
}

export interface DocumentRow {
  id: number;
  name: string;
  description: string | null;
  category: string;
  storagePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: number;
}

export async function insertDocument(input: CreateDocumentInput) {
  const [inserted] = await db
    .insert(documents)
    .values({
      name: input.name,
      description: input.description,
      category: input.category,
      storagePath: input.storagePath,
      fileSize: input.fileSize,
      fileType: input.fileType,
      uploadedBy: input.uploadedBy,
    })
    .returning({ id: documents.id });
  return inserted;
}

export async function getDocumentById(id: number) {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id));
  return rows[0] ?? null;
}

export async function updateDocumentStoragePath(id: number, storagePath: string) {
  await db
    .update(documents)
    .set({ storagePath })
    .where(eq(documents.id, id));
}

export async function deleteDocumentById(id: number) {
  await db.delete(documents).where(eq(documents.id, id));
}
