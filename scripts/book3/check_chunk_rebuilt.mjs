import fs from 'fs';
const chunk = JSON.parse(fs.readFileSync('assets/hymns/full/000.json', 'utf8'));
const first = chunk[0];
console.log('chunk rebuilt - first hymn:', first.id);
console.log('keys:', Object.keys(first).join(', '));
console.log('title_en present?', 'title_en' in first);
console.log('verses_en present?', 'verses_en' in first);
console.log('title_en value:', first.title_en);
console.log('verses_de present?', 'verses_de' in first);
