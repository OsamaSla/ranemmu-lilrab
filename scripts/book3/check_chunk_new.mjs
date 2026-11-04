import fs from 'fs';
try {
  const chunk = JSON.parse(fs.readFileSync('assets/hymns/full/000.json', 'utf8'));
  const first = chunk[0];
  console.log('chunk000 first:', first.id, '| EN:', !!first.title_en, '| DE:', !!first.title_de);
  console.log('EN title:', first.title_en || 'NONE');
  console.log('DE lines count:', first.verses_de ? first.verses_de.length : 0);
  console.log('EN lines count:', first.verses_en ? first.verses_en.length : 0);
} catch (e) { console.log('chunk read error:', e.message); }
