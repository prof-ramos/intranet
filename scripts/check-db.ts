import { db } from '../src/lib/db';
import { admins } from '../src/lib/db/schema';

async function main() {
  const rows = await db.select().from(admins);
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(console.error);
