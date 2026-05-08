import Database from 'better-sqlite3';
import path from 'path';

// This initializes a SQLite database connection
// The database file will be created in the project root as `sqlite.db`
const dbPath = path.join(process.cwd(), 'sqlite.db');

export const db = new Database(dbPath, {
  // verbose: console.log
});

// Optionally, add some PRAGMAs for performance and reliability
db.pragma('journal_mode = WAL');

// Example usage:
// export const getUsers = () => {
//   return db.prepare('SELECT * FROM users').all();
// }
