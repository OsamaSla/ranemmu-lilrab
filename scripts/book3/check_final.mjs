import fs from 'fs';
const chunk = JSON.parse(fs.readFileSync('assets/hymns/full/000.json', 'utf8'));
const first = chunk[0];
const book3Count = chunk.filter(h => h.book === 'book3').length;
console.log('chunk000 first:', first.id, 'book:', first.book, 'number:', first.number);
console.log('EN:', !!first.title_en, '| DE:', !!first.title_de);
console.log('EN title:', first.title_en);
console.log('verses_en count:', first.verses_en ? first.verses_en.length : 0);
console.log('book3 in chunk:', book3Count);
