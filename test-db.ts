#!/usr/bin/env node

import 'dotenv/config';
import { Pool } from 'pg';

const HORIZONTAL_LINE = '─'.repeat(50);

console.log('\nTesting Database Connection...\n');
console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

if (!process.env.DATABASE_URL) {
  console.error('\nDATABASE_URL not found in .env file');
  console.log('Please read DATABASE_FIX.md for setup instructions\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000,
});

interface DatabaseInfo {
  current_time: Date;
  pg_version: string;
}

interface TableInfo {
  table_name: string;
}

const testConnection = async (): Promise<void> => {
  try {
    console.log('Attempting to connect...\n');

    const result = await pool.query<DatabaseInfo>('SELECT NOW() as current_time, version() as pg_version');

    console.log('Connection Successful!\n');
    console.log('Database Info:');
    console.log(HORIZONTAL_LINE);
    console.log('Current Time:', result.rows[0].current_time);
    console.log('PostgreSQL Version:', result.rows[0].pg_version.split(',')[0]);
    console.log(HORIZONTAL_LINE);

    const tablesResult = await pool.query<TableInfo>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('hubs', 'links', 'analytics')
      ORDER BY table_name
    `);

    console.log('\nTables Status:');
    console.log(HORIZONTAL_LINE);

    const existingTables = tablesResult.rows.map(r => r.table_name);
    const requiredTables = ['hubs', 'links', 'analytics'];

    requiredTables.forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`${tableName} table exists`);
      } else {
        console.log(`${tableName} table will be created on server start`);
      }
    });

    console.log(HORIZONTAL_LINE);
    console.log('\nDatabase is ready!');
    console.log('You can now run: npm run dev\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    const error = err as Error;
    console.error('\nConnection Failed!\n');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Database was deleted or paused');
    console.error('2. Invalid credentials in DATABASE_URL');
    console.error('3. Network/firewall blocking connection');
    console.error('4. Database service is down');
    console.error('\nPlease read DATABASE_FIX.md for solutions\n');

    await pool.end();
    process.exit(1);
  }
};

testConnection();
