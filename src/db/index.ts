import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    // Try to construct connection string from individual vars if DATABASE_URL not set
    let connectionString = process.env.DATABASE_URL;
    
    if (!connectionString && process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
      const password = process.env.SQL_PASSWORD ? `:${encodeURIComponent(process.env.SQL_PASSWORD)}` : '';
      const port = process.env.SQL_PORT ? `:${process.env.SQL_PORT}` : '';
      connectionString = `postgresql://${process.env.SQL_USER}${password}@${process.env.SQL_HOST}${port}/${process.env.SQL_DB_NAME}`;
      console.log('[DB] Constructed connection string from individual vars');
    }

    const poolConfig = connectionString
      ? {
          connectionString,
          ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          max: 10,
          connectionTimeoutMillis: 15000,
        }
      : {
          host: process.env.SQL_HOST,
          port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
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