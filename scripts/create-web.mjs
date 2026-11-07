#!/usr/bin/env node
/**
 * Create static web export for both GitHub Pages and Firebase
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

console.log('🚀 Creating static web export...\n');

// Clean/create dist folder
if (existsSync(DIST)) {
  const files = readdirSync(DIST);
  for (const f of files) {
    if (!['icons'].includes(f)) {
      const fp = join(DIST, f);
      const stats = statSync(fp);
      if (stats.isFile()) {
        unlinkSync(fp);
      } else if (stats.isDirectory()) {
        rmSync(fp, { recursive: true, force: true });
      }
    }
  }
} else {
  mkdirSync(DIST);
}

// Copy assets
console.log('📦 Copying assets...');
copyAssets();

// Generate HTML pages
console.log('\n📄 Generating hymn pages...');

// Read all hymn JSON files
const hymnsDir = join(ROOT, 'assets', 'hymns', 'full');
let hymnList = [];

if (existsSync(hymnsDir)) {
  const jsonFiles = readdirSync(hymnsDir).sort().filter(f => f.endsWith('.json'));
  console.log(`   Found ${jsonFiles.length} JSON files`);
  
  let globalNum = 0;
  for (const file of jsonFiles) {
    try {
      const content = readFileSync(join(hymnsDir, file), 'utf8');
      const data = JSON.parse(content);
      
      // The JSON structure varies - check for array or object
      const items = Array.isArray(data) ? data : [data];
      
      for (const hymn of items) {
        if (hymn.id && hymn.title && hymn.verses) {
          hymnList.push({ ...hymn, number: ++globalNum });
        }
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not parse ${file}: ${e.message.substring(0,50)}`);
    }
  }
  
  console.log(`   ✅ Loaded ${hymnList.length} hymns\n`);
} else {
  throw new Error('Hymn directory not found. Run `npm run build:corpus` first.');
}

// Generate library page
generateLibraryPage(hymnList);

// Generate each hymn page
for (const [idx, hymn] of hymnList.entries()) {
  if (idx % 500 === 0) {
    console.log(`   Progress: ${idx}/${hymnList.length} (${Math.round(idx / hymnList.length * 100)}%)`);
  }
  
  generateHymnPage(hymn, idx < hymnList.length - 1 ? hymnList[idx + 1] : null);
}

console.log(`\n✅ Generated ${hymnList.length} hymn pages!\n`);

// Output deployment instructions
console.log('📤 Deployment ready at: dist/');
console.log('🎯 Visit: https://osamsla.github.io/ranemmu-lilrab/\n');

function copyAssets() {
  const files = ['manifest.json', '404.html', 'PWA-INSTALL-GUIDE.html', 'sw.js'];
  for (const file of files) {
    const src = join(PUBLIC, file);
    if (existsSync(src)) {
      writeFileSync(join(DIST, file), readFileSync(src, 'utf8'));
      console.log(`   ✅ ${file}`);
    }
  }
  
  // Copy icons
  const iconsSrc = join(PUBLIC, 'icons');
  if (existsSync(iconsSrc)) {
    const iconsDest = join(DIST, 'icons');
    mkdirSync(iconsDest, { recursive: true });
    
    for (const icon of readdirSync(iconsSrc)) {
      writeFileSync(join(iconsDest, icon), readFileSync(join(iconsSrc, icon)));
      console.log(`   ✅ icons/${icon}`);
    }
  }
}

function generateLibraryPage(hymns) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>المكتبة | الترنيمة للرب</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #0A1A14 0%, #1A2E24 100%); direction: rtl; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #C5A03D 0%, #D4B85F 100%); padding: 20px; text-align: center; color: #0A1A14; }
    .search-box { max-width: 600px; margin: 20px auto; padding: 0 20px; }
    .search-input { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-family: inherit; }
    .library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .hymn-card { background: rgba(212, 184, 95, 0.15); border-radius: 12px; padding: 18px; cursor: pointer; transition: transform 0.2s, background 0.2s; border-right: 4px solid #D4B85F; }
    .hymn-card:hover { transform: translateY(-3px); background: rgba(212, 184, 95, 0.25); }
    .hymn-title { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
    .hymn-number { color: #D4B85F; font-size: 14px; }
    .back-btn { position: absolute; left: 20px; top: 20px; color: #0A1A14; text-decoration: none; font-size: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-btn">← الرئيسية</a>
    <h1 style="margin: 0;">📚 مكتبة الترنيمة</h1>
    <p style="opacity: 0.9;">${hymns.length.toLocaleString('ar-EG')} ترنيمة روحية</p>
    <div class="search-box">
      <input type="text" class="search-input" placeholder="ابحث عن ترنيمة..." id="search">
    </div>
  </div>
  
  <div class="library-grid" id="library">
${hymns.map(h => `    <div class="hymn-card" onclick="location.href='/hymn/tr${String(h.id.replace('tr', '')).padStart(4, '0')}}'">
      <div class="hymn-number">#${h.number}</div>
      <div class="hymn-title">${h.title}</div>
    </div>`).join('\n')}
  </div>
  
  <script>
    document.getElementById('search').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.hymn-card').forEach(card => {
        const title = card.querySelector('.hymn-title').textContent.toLowerCase();
        card.style.display = title.includes(query) ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;
  
  writeFileSync(join(DIST, 'library.html'), html);
  console.log('   ✅ library.html');
}

function generateHymnPage(hymn, nextHymn) {
  const hymnNum = String(hymn.id.replace('tr', '')).padStart(4, '0');
  const destDir = join(DIST, 'hymn', `tr${hymnNum}`);
  
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  let versesHtml = '';
  
  if (hymn.verses && Array.isArray(hymn.verses)) {
    versesHtml = hymn.verses.map((verse, idx) => `    <div class="verse ${verse.chorus ? 'chorus' : ''}" id="verse-${idx}">
      <div class="label ${verse.chorus ? 'chorus-label' : ''}">${verse.label}</div>
      <div class="lines">
${verse.lines.map(line => `<p style="margin-bottom: 8px;">${escapeHtml(line)}</p>`).join('\n')}
      </div>
    </div>\n`).join('\n');
  }
  
  const prevText = hymn.number > 1 ? 'السابق ↗' : '';
  const nextText = nextHymn ? `↖ التالي #${nextHymn.number}` : '';
  
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#D4B85F">
  <meta name="mobile-web-app-capable" content="yes">
  <title>${hymn.title} | الترنيمة للرب</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #0A1A14 0%, #1A2E24 100%); direction: rtl; overflow-x: hidden; }
    .header { background: linear-gradient(135deg, #C5A03D 0%, #D4B85F 100%); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; color: #0A1A14; position: sticky; top: 0; z-index: 100; }
    .nav-btn { background: transparent; border: none; font-size: 24px; cursor: pointer; padding: 8px; }
    .title { font-size: 17px; font-weight: bold; white-space: nowrap; }
    .content { max-width: 750px; margin: 0 auto; padding: 30px 20px; padding-top: 60px; }
    .verse { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px; border-right: 4px solid #D4B85F; }
    .chorus { border-right-color: #ff6b6b !important; background: rgba(255,107,107,0.1) !important; }
    .label { color: #D4B85F; font-weight: bold; margin-bottom: 12px; font-size: 19px; text-align: center; }
    .chorus-label { color: #ff6b6b; }
    .lines { font-size: 21px; line-height: 1.9; text-align: center; color: #f7f4e9; }
    .controls { text-align: center; margin-top: 30px; display: flex; justify-content: space-around; gap: 20px; padding-bottom: 20px; }
    .control-btn { background: #D4B85F; color: #0A1A14; border: none; padding: 13px 28px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; transition: opacity 0.2s; }
    .control-btn:hover { opacity: 0.9; }
    h1 { text-align: center; margin: 0 0 30px; color: #D4B85F; font-size: 26px; }
    .back-home { color: #0A1A14; text-decoration: none; font-size: 18px; display: inline-block; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-home">🏠 الرئيسية</a>
    <div class="title">${hymn.title}</div>
    <button class="nav-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">⬆</button>
  </div>
  
  <div class="content">
    <h1>#${hymn.number} - ${hymn.title}</h1>
    
${versesHtml}
    
    <div class="controls">
      ${prevText ? `<button class="control-btn" onclick="scrollToVerse(-1)">${prevText}</button>` : '<div></div>'}
      <button class="control-btn" onclick="scrollToVerse(1)">${nextText}</button>
    </div>
  </div>
  
  <script>
    let currentVerse = 0;
    
    function scrollToVerse(direction) {
      const verses = document.querySelectorAll('.verse');
      if (verses.length === 0) return;
      
      currentVerse += direction;
      if (currentVerse < 0) currentVerse = 0;
      if (currentVerse >= verses.length) currentVerse = verses.length - 1;
      
      verses[currentVerse].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    document.querySelectorAll('.verse').forEach((v, i) => {
      v.addEventListener('click', () => {
        if (i !== currentVerse) {
          currentVerse = i;
          v.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  </script>
</body>
</html>`;
  
  writeFileSync(join(destDir, 'index.html'), html);
}

function escapeHtml(text) {
  return text.replace(/[&<"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}
