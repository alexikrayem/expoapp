#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔍 Running Authentication and Onboarding Flow Tests...\n');

try {
  // Check if vitest is available
  if (existsSync('./node_modules/.bin/vitest')) {
    console.log('🧪 Running tests with Vitest...\n');
    execSync('npx vitest run --reporter=verbose', { stdio: 'inherit' });
  } else {
    console.log('📦 Installing testing dependencies...');
    execSync('npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @vitest/ui', { stdio: 'inherit' });
    
    console.log('\n🧪 Running tests with Vitest...');
    execSync('npx vitest run --reporter=verbose', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('❌ Tests failed with error:', error.message);
  process.exit(1);
}