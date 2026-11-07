#!/usr/bin/env node
/**
 * Build static web export for Firebase hosting
 */
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

console.log('🚀 Building static web export...\n');

// Step 1: Create dist folder
if (!existsSync(DIST)) {
  console.log('📁 Creating dist directory...');
  mkdirSync(DIST, { recursive: true });
}

// Step 2: Copy public folder content to dist
console.log('📦 Copying public/ to dist/...');
try {
  const publicFiles = readdirSync(PUBLIC);
  
  for (const file of publicFiles) {
    const src = join(PUBLIC, file);
    const dest = join(DIST, file);
    
    if (file.endsWith('.html') || file.endsWith('.json')) {
      console.log(`   ✅ ${file}`);
    } else if (file === 'icons') {
      console.log(`   📁 icons/ folder`);
    }
  }
  
  // Copy entire public folder recursively
  execSync(`xcopy "${PUBLIC}\\*.*" "${DIST}\\*.*" /E /I`, { stdio: 'inherit' });
  console.log('\n✅ Copied all public files\n');
  
} catch (error) {
  console.error('❌ Error copying files:', error.message);
  process.exit(1);
}

// Step 3: Check if we have required files
console.log('📋 Checking required files in dist/...');
const requiredFiles = ['index.html', 'manifest.json'];
let allPresent = true;

for (const file of requiredFiles) {
  const filePath = join(DIST, file);
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allPresent = false;
  }
}

if (allPresent) {
  console.log('\n🎉 Static export ready at: dist/');
  console.log('📂 Deploy with: firebase deploy --only hosting --project ranemmu-lilrab\n');
} else {
  console.log('\n⚠️  Warning: Some files are missing. Deploy may fail.\n');
}
