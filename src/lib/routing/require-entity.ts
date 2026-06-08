import { notFound } from 'next/navigation';

export async function requireEntityById<T>(
  id: number | null,
  fetcher: (id: number) => Promise<T | null>,
): Promise<T> {
  if (id == null) notFound();
  const entity = await fetcher(id);
  if (!entity) notFound();
  return entity;
}
