import { Pool } from 'pg';

/**
 * Выполняет создание таблиц, если их ещё нет.
 * Дублирует схему из docker/init.sql (без демо-записей), чтобы на пустой
 * базе Render всё работало сразу без ручной миграции.
 */
export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_requests (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  item_type TEXT NOT NULL,
  repairs TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_min INTEGER NOT NULL,
  estimated_max INTEGER NOT NULL,
  estimated_days TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  master_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_requests_ticket_code ON repair_requests (ticket_code);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests (status);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  district TEXT NOT NULL,
  item_restored TEXT NOT NULL,
  before_summary TEXT NOT NULL,
  outcome_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
  `);
}