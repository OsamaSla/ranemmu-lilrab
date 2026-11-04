import fs from 'fs';

function check(path, name) {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const hymns = data.hymns || data;
    console.log(name + ':', hymns.length, 'hymns | EN:', hymns.filter(h => h.title_en).length, '| DE:', hymns.filter(h => h.title_de).length);
  } catch (e) {
    console.log(name + ': ERROR -', e.message);
  }
}

check('content/book3/book3-translated.json', 'TRANSLATION STORE');
check('content/book3/book3.json', 'BUILT BOOK3');
check('content/book3.json', 'CORPUS SOURCE');
