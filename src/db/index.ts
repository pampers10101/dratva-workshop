import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    let connectionString = process.env.DATABASE_URL;
    
    // Fallback: construct from individual SQL_* vars
    if (!connectionString && process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
      const password = process.env.SQL_PASSWORD ? `:${encodeURIComponent(process.env.SQL_PASSWORD)}` : '';
      const port = process.env.SQL_PORT ? `:${process.env.SQL_PORT}` : '';
      connectionString = `postgresql://${process.env.SQL_USER}${password}@${process.env.SQL_HOST}${port}/${process.env.SQL_DB_NAME}`;
      console.log('[DB] Constructed connection string from individual vars');
    }

    if (!connectionString) {
      console.warn('[DB] No database configuration found (DATABASE_URL or SQL_* vars missing). Pool will not connect until config is available.');
      // Return a dummy pool that fails fast with clear error
      global._postgresPool = {
        query: async () => { throw new Error('Database not configured: DATABASE_URL or SQL_* env vars missing'); },
        on: () => {},
        end: async () => {},
      } as any;
      return global._postgresPool;
    }

    const poolConfig = {
      connectionString,
      ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });