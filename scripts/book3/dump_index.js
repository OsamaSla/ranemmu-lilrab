const cp = require('child_process');
const fs = require('fs');

let all = '';
for (let p = 1; p <= 13; p++) {
  const pad = String(p).padStart(2, '0');
  const img = `scratch_index/page_${pad}.png`;
  const out = cp.execSync(`"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" ${img} stdout -l ara --psm 6`, { encoding: 'utf8' });
  all += `\n\n=== PAGE ${pad} ===\n\n` + out;
}
fs.writeFileSync('all_index_ocr.txt', all, 'utf8');
console.log('Done, length:', all.length);
