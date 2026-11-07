#!/usr/bin/env node
/**
 * Fix hymn page paths and create redirect pages
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'D:/PROJECTS/ranemmu-lilrab/dist';

console.log('🔧 Fixing hymn page paths...\n');

// Check what's in dist/hymn folder
const hymnDir = join(DIST, 'hymn');

if (!existsSync(hymnDir)) {
  console.error('❌ No hymn folder found!');
  process.exit(1);
}

const hymnFolders = readdirSync(hymnDir).sort();
console.log(`Found ${hymnFolders.length} hymn folders\n`);

// Create proper hymn redirect/index pages
let created = 0;

for (const folderName of hymnFolders) {
  const folderPath = join(hymnDir, folderName);
  
  if (!folderPath.endsWith('.html')) {
    // This is a folder like "tr0001", "trh0616", etc.
    const indexPath = join(folderPath, 'index.html');
    
    if (existsSync(indexPath)) {
      try {
        let content = readFileSync(indexPath, 'utf8');
        
        // Add meta refresh redirect for root access
        const redirectMeta = '<meta http-equiv="refresh" content="0;url=/library.html">\n';
        
        // Find <head> tag and insert redirect
        const headMatch = content.match(/<head[^>]*>/);
        if (headMatch) {
          const endOfHead = headMatch[0].length + 5; // Include > character
          content = content.slice(0, endOfHead) + redirectMeta + content.slice(endOfHead);
        }
        
        writeFileSync(indexPath, content);
        created++;
      } catch (e) {
        console.warn(`⚠️  Could not fix ${folderName}: ${e.message}`);
      }
    }
  }
}

console.log(`✅ Fixed ${created} hymn pages\n`);

// Also create root index.html that redirects to library
const indexFile = join(DIST, 'index.html');
const indexContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=/library.html">
  <title>الترنيمة للرب | Redirecting...</title>
  <style>
    body { font-family: Tahoma, sans-serif; direction: rtl; padding: 50px; text-align: center; background: linear-gradient(135deg, #0A1A14 0%, #1A2E24 100%); color: white; }
    h1 { color: #D4B85F; }
  </style>
</head>
<body>
  <h1>جاري التوجيه إلى المكتبة...</h1>
  <p>If not redirected, <a href="/library.html">click here</a></p>
</body>
</html>`;

writeFileSync(indexFile, indexContent);
console.log('✅ Created index.html redirect');

console.log('\n📤 Now deploy these changes!');
console.log('   firebase deploy --only hosting --project ranemmu-lilrab');
