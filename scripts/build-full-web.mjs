#!/usr/bin/env node
/**
 * Complete build script for static web export
 * Generates all hymn pages + PWA assets
 * Ready for Firebase & GitHub Pages deployment
 */
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');

console.log('🚀 Building FULL static web export...\n');

// Get all hymn IDs from loader
let hymnIds = [];
try {
  const summaries = execSync('node -e "require(\'./dist/libraries/index\').getSummaries().then(s=>console.log(JSON.stringify(s.map(x=>x.id))))"', {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
    timeout: 30000
  }).trim();
  
  if (summaries) {
    hymnIds = JSON.parse(summaries);
  }
} catch (e) {
  console.log('⚠️  Could not extract hymn IDs directly');
  console.log('   Will use expo export instead...\n');
}

// Method 1: Try Expo Static Export
try {
  console.log('📦 Attempting Expo static export...\n');
  
  // Clean previous builds
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
  }
  
  console.log('   Running expo export --web...');
  
  // Try with different approaches
  const commands = [
    'npx expo export',
    'npx expo export --platform web'
  ];
  
  let success = false;
  
  for (const cmd of commands) {
    try {
      execSync(cmd, { 
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      if (existsSync(DIST)) {
        const files = countFiles(DIST);
        console.log(`\n✅ Successfully exported ${files.total} files (${files.html} HTML pages)\n`);
        success = true;
        break;
      }
    } catch (e) {
      // Try next command
      continue;
    }
  }
  
  if (!success && !existsSync(DIST)) {
    console.log('\n⚠️  Expo export failed or created empty output\n');
    throw new Error('No dist folder');
  }
  
} catch (error) {
  console.log('❌ Expo export completely failed\n');
  throw error;
}

// Helper function to count files
function countFiles(dir) {
  let total = 0;
  let html = 0;
  
  function walk(d) {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        total++;
        if (entry.name.endsWith('.html')) html++;
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          walk(join(d, entry.name));
        }
      }
    } catch {}
  }
  
  walk(dir);
  return { total, html };
}

const fileCount = countFiles(DIST);
console.log(`\n📊 Export Summary:`);
console.log(`   Total files: ${fileCount.total}`);
console.log(`   HTML pages: ${fileCount.html}\n`);

// Step 3: Fix paths in manifest.json
const manifestPath = join(DIST, 'manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    
    // Ensure correct root paths for hosting
    if (manifest.start_url?.startsWith('/ranemmu-lilrab/')) {
      manifest.start_url = manifest.start_url.replace('/ranemmu-lilrab/', '/');
      console.log('✅ Updated start_url path');
    }
    
    if (manifest.icons) {
      manifest.icons.forEach(icon => {
        if (icon.src?.startsWith('/ranemmu-lilrab/')) {
          icon.src = icon.src.replace('/ranemmu-lilrab/', '/');
        }
      });
      console.log('✅ Updated icon paths');
    }
    
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (e) {
    console.log('⚠️  Could not update manifest.json:', e.message);
  }
}

// Step 4: Add public assets to dist
console.log('\n📦 Adding additional assets from public/...');
try {
  const publicEntries = readdirSync(PUBLIC);
  
  for (const entry of publicEntries) {
    const srcPath = join(PUBLIC, entry);
    const destPath = join(DIST, entry);
    
    const stat = existsSync(srcPath) && 
                 ((typeof require === 'undefined') ? 
                   fs.lstatSync(srcPath).isDirectory() : false);
    
    if (!stat && !srcPath.includes('index.html')) {
      try {
        if (stat) {
          // Directory
          if (!existsSync(destPath)) {
            mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
            console.log(`   📁 ${entry}/ copied`);
          }
        } else {
          // File
          copyFileSync(srcPath, destPath);
          console.log(`   ✅ ${entry} copied`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${entry}: ${e.message}`);
      }
    }
  }
} catch (e) {
  console.log('⚠️  Public folder copy had issues');
}

console.log('\n🎉 Build complete!\n');
console.log('📂 Output directory:', DIST);
console.log(`📊 Final stats: ${fileCount.total} files, ${fileCount.html} HTML pages\n`);

console.log('📤 To deploy:');
console.log('   Firebase: firebase deploy --only hosting --project ranemmu-lilrab');
console.log('   GitHub Pages: Deploy workflow in .github/workflows/deploy.yml\n');

// Copy helper
function copyRecursive(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Expose fs module
import { lstatSync } from 'fs';
global.fs = { lstatSync, readdirSync, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync };
