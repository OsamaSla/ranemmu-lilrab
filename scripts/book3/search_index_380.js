const cp = require('child_process');

for (let p = 1; p <= 13; p++) {
  const pad = String(p).padStart(2, '0');
  const img = `scratch_index/page_${pad}.png`;
  const out = cp.execSync(`"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" ${img} stdout -l ara --psm 6`, { encoding: 'utf8' });
  const lines = out.split('\n');
  for (const line of lines) {
    if (/38[0-6]|٣٨[٠-٦]/.test(line)) {
      console.log(`Page ${pad}:`, line.trim());
    }
  }
}
