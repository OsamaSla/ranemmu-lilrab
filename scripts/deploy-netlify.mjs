#!/usr/bin/env node
/**
 * Create deploy manifest for Netlify/Vercel
 * This copies all files from public/ to a deploy folder
 */
import { readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const DEPLOY = join(ROOT, '.netlify', 'frontend', 'publish');

// Create deploy directory
if (!await fs.existsSync(DEPLOY)) {
  await fs.mkdirSync(DEPLOY, { recursive: true });
}

console.log('📦 Preparing deployment files...');

async function copyDir(src, dest) {
  const entries = await readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!await exists(destPath)) {
        await mkdirSync(destPath, { recursive: true });
      }
      await copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`✅ ${entry.name}`);
    }
  }
}

await copyDir(PUBLIC, DEPLOY);

console.log('\n🎉 Deployment ready!');
console.log(`📁 Deploy folder: .netlify/frontend/publish`);
console.log(`\nTo use with Netlify:`);
console.log(`1. Go to https://app.netlify.com/`);
console.log(`2. Add new site → Import from Git → OsamaSla/ranemmu-lilrab`);
console.log(`3. Build command: (leave empty)`);
console.log(`4. Publish directory: .netlify/frontend/publish`);
console.log(`5. Click Deploy!`);
