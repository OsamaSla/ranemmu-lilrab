import fs from 'fs';
const dir = 'content/book3/parts';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  const h = j.hymns ? j.hymns[0] : j;
  if (h && h.number) {
    const id = 'b3' + String(h.number).padStart(4, '0');
    if (h.id !== id) {
      h.id = id;
      fs.writeFileSync(dir + '/' + f, JSON.stringify(j, null, 2), 'utf8');
      console.log('Fixed id:', f, '->', id);
    }
  }
}
console.log('All .json files have correct id (b3XXXX).');
