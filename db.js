require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to Neon (PostgreSQL) database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const schema = `
  CREATE TABLE IF NOT EXISTS hubs (
    id SERIAL PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    uid TEXT, -- Firebase User ID
    title TEXT,
    description TEXT,
    theme_config TEXT,
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
    location_target TEXT
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
`;

const initDb = async () => {
  try {
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing schema:', err);
  }
};

// Initialize schema if DATABASE_URL is present
if (process.env.DATABASE_URL) {
  initDb();
} else {
  console.warn("WARNING: DATABASE_URL not found in .env. Database connection will fail.");
}

module.exports = {
  query: (text, params) => pool.query(text, params),
};
