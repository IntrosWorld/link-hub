require('dotenv').config();
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const advancedSchema = `
  -- Drop existing tables
  DROP TABLE IF EXISTS user_link_data CASCADE;
  DROP TABLE IF EXISTS link_rules CASCADE;
  DROP TABLE IF EXISTS link_arrangements CASCADE;
  DROP TABLE IF EXISTS analytics CASCADE;
  DROP TABLE IF EXISTS links CASCADE;
  DROP TABLE IF EXISTS hubs CASCADE;
  DROP TABLE IF EXISTS users CASCADE;

  -- Users table
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,20}$')
  );

  -- Hubs table with visibility controls
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

  -- Links table with ADVANCED scheduling and targeting
  CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,

    -- Time-based controls
    start_hour INTEGER CHECK (start_hour >= 0 AND start_hour < 24),
    end_hour INTEGER CHECK (end_hour >= 0 AND end_hour < 24),
    time_priority INTEGER DEFAULT 0,

    -- Date-based controls (NEW)
    schedule_start_date DATE,
    schedule_end_date DATE,
    days_of_week INTEGER[],  -- 0=Sunday, 1=Monday, ..., 6=Saturday

    -- Click limits (NEW)
    max_clicks INTEGER,  -- null = unlimited
    max_clicks_per_user INTEGER,  -- null = unlimited per user

    -- Device & Location targeting
    device_target TEXT DEFAULT 'all' CHECK(device_target IN ('all', 'mobile', 'desktop')),
    location_target TEXT,

    -- Visibility & Access controls
    visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'restricted')),
    allowed_usernames TEXT[],

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP  -- Specific expiry time (NEW)
  );

  -- Custom link arrangements (per-user ordering)
  CREATE TABLE link_arrangements (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,  -- null = default arrangement for all
    link_order INTEGER[] NOT NULL,  -- Array of link IDs in desired order
    description TEXT,  -- e.g., "VIP users arrangement", "Weekend special order"
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hub_id, username)
  );

  -- Advanced link rules (for complex conditions)
  CREATE TABLE link_rules (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK(rule_type IN (
      'geo_fence',       -- Geographic boundaries
      'prerequisite',    -- Show only after clicking another link
      'ab_test',         -- A/B testing variant
      'conditional',     -- Custom boolean conditions
      'schedule_complex' -- Complex scheduling rules
    )),
    rule_config JSONB NOT NULL,  -- Flexible config for each rule type
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,  -- Execution order for multiple rules
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Per-user link interaction data
  CREATE TABLE user_link_data (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicks INTEGER DEFAULT 0,
    first_clicked TIMESTAMP,
    last_clicked TIMESTAMP,
    metadata JSONB,  -- Store arbitrary user-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, link_id)
  );

  -- Analytics table
  CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    hub_id INTEGER REFERENCES hubs(id) ON DELETE SET NULL,
    link_id INTEGER,
    username TEXT,  -- Track which user viewed/clicked (if authenticated)
    event_type TEXT CHECK(event_type IN ('view', 'click')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_hash TEXT,
    metadata JSONB  -- Additional context (geolocation, referrer, etc.)
  );

  -- Indexes for performance
  CREATE INDEX idx_users_uid ON users(uid);
  CREATE INDEX idx_users_username ON users(username);
  CREATE INDEX idx_hubs_username ON hubs(username);
  CREATE INDEX idx_hubs_handle ON hubs(handle);
  CREATE INDEX idx_links_hub_id ON links(hub_id);
  CREATE INDEX idx_links_visibility ON links(visibility);
  CREATE INDEX idx_links_expires_at ON links(expires_at) WHERE expires_at IS NOT NULL;
  CREATE INDEX idx_link_arrangements_hub_username ON link_arrangements(hub_id, username);
  CREATE INDEX idx_link_rules_link_id ON link_rules(link_id);
  CREATE INDEX idx_link_rules_enabled ON link_rules(enabled) WHERE enabled = true;
  CREATE INDEX idx_user_link_data_username ON user_link_data(username);
  CREATE INDEX idx_user_link_data_link_id ON user_link_data(link_id);
  CREATE INDEX idx_analytics_hub_id ON analytics(hub_id);
  CREATE INDEX idx_analytics_link_id ON analytics(link_id);
  CREATE INDEX idx_analytics_username ON analytics(username);
`;

async function migrateAdvanced(): Promise<void> {
  try {
    console.log('🚀 Starting ADVANCED migration...');
    console.log('⚠️  This will DELETE all existing data!');
    console.log('');
    console.log('📋 New Features:');
    console.log('   ✨ Custom link ordering (per-user or default)');
    console.log('   📅 Date-based scheduling (start/end dates)');
    console.log('   📆 Day-of-week targeting');
    console.log('   🔢 Click limits (global & per-user)');
    console.log('   ⏰ Expiry timestamps');
    console.log('   🎯 Advanced rules engine');
    console.log('   📊 Per-user interaction tracking');
    console.log('');

    await pool.query(advancedSchema);

    console.log('✅ Advanced database schema created successfully!');
    console.log('');
    console.log('🎛️ You now have MAXIMUM CONTROL over:');
    console.log('   • Link arrangement (custom order per user)');
    console.log('   • Scheduling (dates, days, times, expiry)');
    console.log('   • Access control (visibility, allowed users)');
    console.log('   • Click limits (prevent overexposure)');
    console.log('   • Complex rules (geo, prerequisites, A/B tests)');
    console.log('   • Per-user analytics and behavior');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateAdvanced();
