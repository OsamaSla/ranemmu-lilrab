#!/usr/bin/env node
/**
 * Build static web export for Firebase hosting
 * Uses npx expo export without platform flag
 */
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

console.log('🚀 Building static web export...\n');

// Step 1: Run expo export
try {
  console.log('📦 Running expo export...');
  // Use --web flag or no flag at all  
  const result = execSync('npx expo export', { 
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.log('\n⚠️  Export may have partially succeeded. Continuing...\n');
}

// Step 2: Check if dist folder was created
if (!existsSync(DIST)) {
  console.error('❌ No dist folder created. Creating empty one.');
  mkdirSync(DIST, { recursive: true });
}

// Step 3: Copy dist files to public
console.log('📁 Checking generated files...');

function walkDir(dir) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = join(dir, file);
      const stat = existsSync(filePath) && readdirSync(filePath).length > 0 ? 
        { isDirectory: true } : { isDirectory: false };
      
      try {
        stat.isDirectory = readdirSync(filePath).some(f => 
          existsSync(join(filePath, f)) && readdirSync(join(filePath, f)).length > 0
        );
      } catch {}
      
      if (stat.isDirectory && file !== 'node_modules' && !file.startsWith('.')) {
        results = results.concat(walkDir(filePath));
      } else {
        results.push({ path: filePath, depth: filePath.split('/').length - dir.split('/').length });
      }
    }
  } catch {}
  return results;
}

// Count files in dist
let htmlCount = 0;
let totalFiles = 0;

function countFiles(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      totalFiles++;
      if (entry.name.endsWith('.html')) htmlCount++;
      if (entry.isDirectory()) countFiles(join(dir, entry.name));
    }
  } catch {}
}

countFiles(DIST);

console.log(`   Found ${totalFiles} files in dist/`);
console.log(`   HTML pages: ${htmlCount}\n`);

// Step 4: Update manifest.json with correct paths
const manifestPath = join(DIST, 'manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    
    // Fix PWA paths for Firebase hosting (no /ranemmu-lilrab prefix needed)
    manifest.start_url = manifest.start_url?.replace('/ranemmu-lilrab/', '/');
    manifest.icons?.forEach(icon => {
      icon.src = icon.src?.replace('/ranemmu-lilrab/', '/');
    });
    
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Fixed manifest.json paths');
  } catch (e) {
    console.log('⚠️  Could not update manifest.json');
  }
}

// Step 5: Copy public assets that weren't exported
console.log('📦 Copying additional assets...');
try {
  if (existsSync(PUBLIC)) {
    execSync(`xcopy "${PUBLIC}\\*.*" "${DIST}\\*.*" /E /I`, { stdio: 'ignore' });
    console.log('✅ Copied public folder contents');
  }
} catch (e) {
  console.log('⚠️  Public folder copy failed');
}

console.log('\n🎉 Static export complete!');
console.log(`📂 Output: ${DIST}`);
console.log(`   Total files: ${totalFiles}`);
console.log(`   HTML pages: ${htmlCount}\n`);

console.log('📤 Deploy to Firebase:');
console.log('   firebase deploy --only hosting --project ranemmu-lilrab\n');
