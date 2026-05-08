import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { count } from 'drizzle-orm';

async function main() {
  const [{ total }] = await db.select({ total: count() }).from(admins);
  console.log(`Admins in DB: ${total}`);
}
main().catch(console.error);
