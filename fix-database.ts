#!/usr/bin/env node

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

interface ColumnInfo {
  column_name: string;
  data_type?: string;
}

const fixDatabase = async (): Promise<void> => {
  console.log('\nFixing database schema...\n');

  try {
    const checkColumn = await pool.query<ColumnInfo>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'hubs' AND column_name = 'uid'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('uid column is missing from hubs table');
      console.log('Adding uid column...');

      await pool.query(`
        ALTER TABLE hubs
        ADD COLUMN IF NOT EXISTS uid TEXT
      `);

      console.log('uid column added successfully!');
    } else {
      console.log('uid column already exists');
    }

    const verify = await pool.query<ColumnInfo>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'hubs'
      ORDER BY ordinal_position
    `);

    console.log('\nCurrent hubs table structure:');
    verify.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\nDatabase fix complete!\n');
  } catch (error) {
    const err = error as Error;
    console.error('\nError fixing database:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

fixDatabase();
