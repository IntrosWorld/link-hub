#!/usr/bin/env node

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const HORIZONTAL_LINE = '─'.repeat(50);
const DOUBLE_LINE = '═'.repeat(50);

interface EnvVars {
  [key: string]: string | undefined;
}

interface ServiceAccount {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
}

console.log('\nChecking Environment Variables...\n');

console.log('Backend (.env):');
console.log(HORIZONTAL_LINE);

const backendEnvVars: EnvVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'FIREBASE_SERVICE_ACCOUNT': process.env.FIREBASE_SERVICE_ACCOUNT
};

let backendIssues = 0;

const isInvalidValue = (value: string | undefined): boolean => {
  if (!value) return true;
  if (value.includes('YOUR_')) return true;
  if (value.includes('your-project')) return true;
  return false;
};

const validateFirebaseServiceAccount = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value) as ServiceAccount;
    return !!(parsed.project_id && parsed.private_key && parsed.client_email);
  } catch {
    return false;
  }
};

Object.entries(backendEnvVars).forEach(([key, value]) => {
  if (isInvalidValue(value)) {
    console.log(`${key}: Missing or not configured`);
    backendIssues++;
  } else if (key === 'FIREBASE_SERVICE_ACCOUNT') {
    try {
      if (validateFirebaseServiceAccount(value!)) {
        console.log(`${key}: Configured`);
      } else {
        console.log(`${key}: Invalid JSON structure`);
        backendIssues++;
      }
    } catch {
      console.log(`${key}: Invalid JSON format`);
      backendIssues++;
    }
  } else {
    console.log(`${key}: Configured`);
  }
});

console.log();

console.log('Frontend (client/.env):');
console.log(HORIZONTAL_LINE);

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

  const isClientVarConfigured = (varName: string): boolean => {
    const regex = new RegExp(`${varName}=(.+)`, 'm');
    const match = clientEnvContent.match(regex);

    if (!match || !match[1]) return false;
    if (match[1].includes('YOUR_')) return false;
    if (match[1].trim() === '') return false;
    return true;
  };

  requiredClientVars.forEach(varName => {
    if (isClientVarConfigured(varName)) {
      console.log(`${varName}: Configured`);
    } else {
      console.log(`${varName}: Missing or not configured`);
      frontendIssues++;
    }
  });
} else {
  console.log('client/.env file not found!');
  frontendIssues = 6;
}

console.log();
console.log(DOUBLE_LINE);

const totalIssues = backendIssues + frontendIssues;

if (totalIssues === 0) {
  console.log('All environment variables are configured!');
  console.log('You can now run: npm run dev');
} else {
  console.log(`Found ${totalIssues} issue(s) with environment variables`);
  console.log('Please read FIREBASE_SETUP.md for configuration instructions');
  console.log();
  console.log('Quick setup:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Create or select a project');
  console.log('3. Enable Email/Password authentication');
  console.log('4. Get credentials (see FIREBASE_SETUP.md for details)');
  console.log('5. Add credentials to .env and client/.env files');
}

console.log(DOUBLE_LINE);
console.log();

process.exit(totalIssues === 0 ? 0 : 1);
