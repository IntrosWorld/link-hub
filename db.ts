import 'dotenv/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to Neon (PostgreSQL) database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hubs (
    id SERIAL PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    username TEXT,
    uid TEXT,
    title TEXT,
    description TEXT,
    theme_config TEXT DEFAULT '{}',
    visibility TEXT DEFAULT 'public',
    allowed_usernames TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER REFERENCES hubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    start_hour INTEGER,
    end_hour INTEGER,
    time_priority INTEGER DEFAULT 0,
    device_target TEXT DEFAULT 'all',
    location_target TEXT,
    visibility TEXT DEFAULT 'public',
    allowed_usernames TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER REFERENCES hubs(id) ON DELETE SET NULL,
    link_id INTEGER,
    event_type TEXT CHECK(event_type IN ('view', 'click')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_hash TEXT
  );

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name TEXT;

  ALTER TABLE hubs
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS uid TEXT,
    ADD COLUMN IF NOT EXISTS theme_config TEXT DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS allowed_usernames TEXT[];

  ALTER TABLE links
    ADD COLUMN IF NOT EXISTS device_target TEXT DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS allowed_usernames TEXT[],
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
`;

const initDb = async (): Promise<void> => {
  try {
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing schema:', err);
  }
};

if (process.env.DATABASE_URL) {
  initDb();
} else {
  console.warn("WARNING: DATABASE_URL not found in .env. Database connection will fail.");
}

export const query = <T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
