#!/usr/bin/env node

/**
 * Database Connection Tester
 * Quick test to verify your DATABASE_URL is working
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('\n🔍 Testing Database Connection...\n');
console.log('Database URL:', process.env.DATABASE_URL ? '✓ Found' : '✗ Missing');

if (!process.env.DATABASE_URL) {
  console.error('\n❌ DATABASE_URL not found in .env file');
  console.log('📖 Please read DATABASE_FIX.md for setup instructions\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000, // 5 second timeout
});

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect...\n');

    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');

    console.log('✅ Connection Successful!\n');
    console.log('Database Info:');
    console.log('─'.repeat(50));
    console.log('Current Time:', result.rows[0].current_time);
    console.log('PostgreSQL Version:', result.rows[0].pg_version.split(',')[0]);
    console.log('─'.repeat(50));

    // Test if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('hubs', 'links', 'analytics')
      ORDER BY table_name
    `);

    console.log('\nTables Status:');
    console.log('─'.repeat(50));
    const existingTables = tablesResult.rows.map(r => r.table_name);
    ['hubs', 'links', 'analytics'].forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName} table exists`);
      } else {
        console.log(`⚠️  ${tableName} table will be created on server start`);
      }
    });
    console.log('─'.repeat(50));

    console.log('\n✅ Database is ready!');
    console.log('🚀 You can now run: npm run dev\n');

    await pool.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Connection Failed!\n');
    console.error('Error:', err.message);
    console.error('\nPossible causes:');
    console.error('1. Database was deleted or paused');
    console.error('2. Invalid credentials in DATABASE_URL');
    console.error('3. Network/firewall blocking connection');
    console.error('4. Database service is down');
    console.error('\n📖 Please read DATABASE_FIX.md for solutions\n');

    await pool.end();
    process.exit(1);
  }
}

testConnection();
