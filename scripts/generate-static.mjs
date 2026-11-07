#!/usr/bin/env node
/**
 * Generate static hymn pages for Firebase & GitHub Pages
 * Creates simple HTML files from existing corpus data
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

console.log('🚀 Generating static web pages...\n');

// Create dist folder
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true });
}

// Load hymn data from built corpus
console.log('📦 Loading hymn data...');
try {
  const corpusPath = join(ROOT, 'dist', 'lib', 'data', 'corpus.js');
  const corpusContent = readFileSync(corpusPath, 'utf8');
  const allHymnsMatch = corpusContent.match(/allHymns:\s*(\[.*?\])[\s;]*$/s);
  
  if (!allHymnsMatch) {
    throw new Error('Could not find allHymns in corpus export');
  }
  
  // Extract and parse the array
  const allHymnsStr = allHymnsMatch[1];
  let allHymns;
  try {
    allHymns = JSON.parse(allHymnsStr);
  } catch (e) {
    throw new Error('Corpus data is not valid JSON');
  }
  
  if (!allHymns || !Array.isArray(allHymns)) {
    throw new Error('allHymns is not an array');
  }
  
  console.log(`   ✅ Loaded ${allHymns.length} hymns\n`);
  
  // Copy assets
  console.log('📁 Copying assets...');
  copyAssets();
  
  // Generate library page
  generateLibraryPage(corpusModule.allHymns);
  
  // Generate each hymn page
  let generated = 0;
  for (const hymn of corpusModule.allHymns) {
    try {
      generateHymnPage(hymn, corpusModule.allHymns);
      generated++;
      if (generated % 500 === 0) {
        console.log(`   Processed ${generated}/${corpusModule.allHymns.length} hymns...`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not generate ${hymn.id}: ${e.message}`);
    }
  }
  
  console.log(`\n✅ Generated ${generated} hymn pages!`);
  
} catch (error) {
  console.error('❌ Error loading corpus:', error.message);
  process.exit(1);
}

// Copy asset files
function copyAssets() {
  const filesToCopy = [
    'manifest.json',
    '404.html',
    'hello.html',
    'PWA-INSTALL-GUIDE.html',
    'qr-code.html',
    'sw.js'
  ];
  
  try {
    for (const file of filesToCopy) {
      const src = join(PUBLIC, file);
      if (existsSync(src)) {
        writeFileSync(join(DIST, file), readFileSync(src, 'utf8'));
        console.log(`   ✅ ${file}`);
      }
    }
  } catch (e) {
    console.log(`   ⚠️  Assets copy warning: ${e.message}`);
  }
  
  // Copy icons folder
  const iconsSrc = join(PUBLIC, 'icons');
  if (existsSync(iconsSrc)) {
    const iconsDest = join(DIST, 'icons');
    if (!existsSync(iconsDest)) {
      mkdirSync(iconsDest);
    }
    
    try {
      const iconFiles = readdirSync(iconsSrc);
      for (const icon of iconFiles) {
        writeFileSync(join(iconsDest, icon), readFileSync(join(iconsSrc, icon)));
        console.log(`   ✅ icons/${icon}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Icons copy warning: ${e.message}`);
    }
  }
}

// Generate library page
function generateLibraryPage(hymns) {
  let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>المكتبة | الترنيمة للرب</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; }
    .search-box { max-width: 600px; margin: 20px auto; padding: 0 20px; }
    .search-input { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 16px; }
    .library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .hymn-card { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; cursor: pointer; transition: transform 0.2s; }
    .hymn-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.2); }
    .hymn-title { font-weight: bold; margin-bottom: 8px; }
    .hymn-number { color: #D4B85F; font-size: 0.9rem; }
    .back-btn { position: absolute; left: 20px; top: 20px; color: white; text-decoration: none; font-size: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-btn">← الرئيسية</a>
    <h1>📚 مكتبة الترنيمة</h1>
    <p>${hymns.length.toLocaleString('ar-EG')} ترنيمة روحية</p>
    <div class="search-box">
      <input type="text" class="search-input" placeholder="ابحث عن ترنيمة..." id="search">
    </div>
  </div>
  
  <div class="library-grid" id="library">
${hymns.map(h => `    <div class="hymn-card" onclick="location.href='/hymn/${h.id}'">
      <div class="hymn-number">#${h.number}</div>
      <div class="hymn-title">${h.title}</div>
    </div>`).join('\n')}
  </div>
  
  <script>
    document.getElementById('search').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.hymn-card');
      cards.forEach(card => {
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

// Generate single hymn page
function generateHymnPage(hymn, allHymns) {
  const destDir = join(DIST, 'hymn', hymn.id.replace('/hymn/', ''));
  
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  // Find neighbors
  const currentIndex = allHymns.findIndex(h => h.id === hymn.id);
  const prevHymn = currentIndex > 0 ? allHymns[currentIndex - 1] : null;
  const nextHymn = currentIndex < allHymns.length - 1 ? allHymns[currentIndex + 1] : null;
  
  let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#D4B85F">
  <meta name="mobile-web-app-capable" content="yes">
  <title>${hymn.title} | الترنيمة للرب</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="manifest" href="/manifest.json">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #0A1A14 0%, #1A2E24 100%); direction: rtl; }
    .header { background: linear-gradient(135deg, #C5A03D 0%, #D4B85F 100%); padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; color: #0A1A14; }
    .nav-btn { background: transparent; border: none; font-size: 24px; cursor: pointer; padding: 8px; }
    .title { font-size: 18px; font-weight: bold; }
    .content { max-width: 700px; margin: 0 auto; padding: 30px 20px; }
    .verse { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px; border-right: 4px solid #D4B85F; }
    .chorus { border-right-color: #C5A03D !important; background: rgba(212, 184, 95, 0.1) !important; }
    .label { color: #D4B85F; font-weight: bold; margin-bottom: 10px; font-size: 18px; text-align: center; }
    .chorus-label { color: #ff6b6b; font-weight: bold; }
    .lines { font-size: 20px; line-height: 1.8; text-align: center; }
    .controls { text-align: center; margin-top: 30px; display: flex; justify-content: space-around; gap: 20px; }
    .control-btn { background: #D4B85F; color: #0A1A14; border: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .controls button:hover { opacity: 0.9; }
    h1 { text-align: center; margin-bottom: 30px; color: #D4B85F; }
  </style>
</head>
<body>
  <div class="header">
    <button class="nav-btn" onclick="location.href='/'">🏠</button>
    <div class="title">${hymn.title}</div>
    <button class="nav-btn" onclick="window.location.reload()">🔄</button>
  </div>
  
  <div class="content">
    <h1>#${hymn.number} - ${hymn.title}</h1>
    
${hymn.verses?.map((verse, idx) => `    <div class="verse ${verse.chorus ? 'chorus' : ''}" id="verse-${idx}">
      <div class="label ${verse.chorus ? 'chorus-label' : ''}">${verse.label}</div>
      <div class="lines">
${verse.lines.map(line => `<p style="margin-bottom: 8px;">${line}</p>`).join('\n')}
      </div>
    </div>\n`).join('\n')}
    
    <div class="controls">
      <button class="control-btn" onclick="scrollToVerse(-1)">السابق ↗</button>
      <button class="control-btn" onclick="scrollToVerse(1)">↖ التالي</button>
    </div>
  </div>
  
  <script>
    let currentVerse = 0;
    
    function scrollToVerse(direction) {
      currentVerse += direction;
      const verses = document.querySelectorAll('.verse');
      if (currentVerse >= 0 && currentVerse < verses.length) {
        verses[currentVerse].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    document.querySelectorAll('.verse').forEach((v, i) => {
      v.onclick = () => scrollToVerse(i - currentVerse);
    });
  </script>
</body>
</html>`;
  
  writeFileSync(join(destDir, 'index.html'), html);
}
