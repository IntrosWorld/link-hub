require('dotenv').config();
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const freshSchema = `
  -- Drop existing tables
  DROP TABLE IF EXISTS analytics CASCADE;
  DROP TABLE IF EXISTS links CASCADE;
  DROP TABLE IF EXISTS hubs CASCADE;
  DROP TABLE IF EXISTS users CASCADE;

  -- Create users table
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,20}$')
  );

  -- Create hubs table with username and visibility
  CREATE TABLE hubs (
    id SERIAL PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    uid TEXT NOT NULL,
    title TEXT,
    description TEXT,
    theme_config TEXT DEFAULT '{}',
    visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'restricted')),
    allowed_usernames TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT handle_format CHECK (handle ~ '^[a-zA-Z0-9_-]{3,50}$')
  );

  -- Create links table with visibility controls
  CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    start_hour INTEGER CHECK (start_hour >= 0 AND start_hour < 24),
    end_hour INTEGER CHECK (end_hour >= 0 AND end_hour < 24),
    time_priority INTEGER DEFAULT 0,
    device_target TEXT DEFAULT 'all' CHECK(device_target IN ('all', 'mobile', 'desktop')),
    location_target TEXT,
    visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'restricted')),
    allowed_usernames TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create analytics table
  CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER REFERENCES hubs(id) ON DELETE SET NULL,
    link_id INTEGER,
    event_type TEXT CHECK(event_type IN ('view', 'click')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_hash TEXT
  );

  -- Create indexes for performance
  CREATE INDEX idx_users_uid ON users(uid);
  CREATE INDEX idx_users_username ON users(username);
  CREATE INDEX idx_hubs_username ON hubs(username);
  CREATE INDEX idx_hubs_handle ON hubs(handle);
  CREATE INDEX idx_links_hub_id ON links(hub_id);
  CREATE INDEX idx_analytics_hub_id ON analytics(hub_id);
  CREATE INDEX idx_analytics_link_id ON analytics(link_id);
`;

async function migrateFresh(): Promise<void> {
  try {
    console.log('🔄 Starting fresh migration...');
    console.log('⚠️  This will DELETE all existing data!');

    await pool.query(freshSchema);

    console.log('✅ Database schema recreated successfully!');
    console.log('\n📋 Tables created:');
    console.log('  - users (with username support)');
    console.log('  - hubs (with visibility and allowed_usernames)');
    console.log('  - links (with visibility and allowed_usernames)');
    console.log('  - analytics');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateFresh();
