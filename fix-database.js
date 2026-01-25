#!/usr/bin/env node

/**
 * Database Migration Script
 * Adds missing uid column to hubs table
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixDatabase() {
    console.log('\n🔧 Fixing database schema...\n');

    try {
        // Check if uid column exists
        const checkColumn = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'hubs' AND column_name = 'uid'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('❌ uid column is missing from hubs table');
            console.log('⚙️  Adding uid column...');

            await pool.query(`
                ALTER TABLE hubs
                ADD COLUMN IF NOT EXISTS uid TEXT
            `);

            console.log('✅ uid column added successfully!');
        } else {
            console.log('✅ uid column already exists');
        }

        // Verify the fix
        const verify = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'hubs'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Current hubs table structure:');
        verify.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type})`);
        });

        console.log('\n✅ Database fix complete!\n');

    } catch (error) {
        console.error('\n❌ Error fixing database:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

fixDatabase();
