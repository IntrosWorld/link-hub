#!/usr/bin/env node

/**
 * Environment Variable Checker
 * Verifies that all required Firebase environment variables are configured
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Checking Environment Variables...\n');

// Check Backend Environment Variables
console.log('📦 Backend (.env):');
console.log('─'.repeat(50));

const backendEnvVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'FIREBASE_SERVICE_ACCOUNT': process.env.FIREBASE_SERVICE_ACCOUNT
};

let backendIssues = 0;

Object.entries(backendEnvVars).forEach(([key, value]) => {
  if (!value || value.includes('YOUR_') || value.includes('your-project')) {
    console.log(`❌ ${key}: Missing or not configured`);
    backendIssues++;
  } else {
    // Validate Firebase Service Account JSON
    if (key === 'FIREBASE_SERVICE_ACCOUNT') {
      try {
        const parsed = JSON.parse(value);
        if (parsed.project_id && parsed.private_key && parsed.client_email) {
          console.log(`✅ ${key}: Configured ✓`);
        } else {
          console.log(`⚠️  ${key}: Invalid JSON structure`);
          backendIssues++;
        }
      } catch (e) {
        console.log(`❌ ${key}: Invalid JSON format`);
        backendIssues++;
      }
    } else {
      console.log(`✅ ${key}: Configured ✓`);
    }
  }
});

console.log();

// Check Frontend Environment Variables
console.log('🌐 Frontend (client/.env):');
console.log('─'.repeat(50));

const clientEnvPath = path.join(__dirname, 'client', '.env');
let frontendIssues = 0;

if (fs.existsSync(clientEnvPath)) {
  const clientEnvContent = fs.readFileSync(clientEnvPath, 'utf8');

  const requiredClientVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  requiredClientVars.forEach(varName => {
    const regex = new RegExp(`${varName}=(.+)`, 'm');
    const match = clientEnvContent.match(regex);

    if (!match || !match[1] || match[1].includes('YOUR_') || match[1].trim() === '') {
      console.log(`❌ ${varName}: Missing or not configured`);
      frontendIssues++;
    } else {
      console.log(`✅ ${varName}: Configured ✓`);
    }
  });
} else {
  console.log('❌ client/.env file not found!');
  frontendIssues = 6;
}

console.log();
console.log('═'.repeat(50));

// Summary
const totalIssues = backendIssues + frontendIssues;

if (totalIssues === 0) {
  console.log('✅ All environment variables are configured!');
  console.log('🚀 You can now run: npm run dev');
} else {
  console.log(`⚠️  Found ${totalIssues} issue(s) with environment variables`);
  console.log('📖 Please read FIREBASE_SETUP.md for configuration instructions');
  console.log();
  console.log('Quick setup:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Create or select a project');
  console.log('3. Enable Email/Password authentication');
  console.log('4. Get credentials (see FIREBASE_SETUP.md for details)');
  console.log('5. Add credentials to .env and client/.env files');
}

console.log('═'.repeat(50));
console.log();

process.exit(totalIssues === 0 ? 0 : 1);
