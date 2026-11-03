const sharp = require('sharp');
const cp = require('child_process');
const fs = require('fs');

async function run() {
  for (let s = 133; s <= 140; s++) {
    const pad = String(s).padStart(3, '0');
    for (const side of ['right', 'left']) {
      const img = `assets/book3/split/spread_${pad}_${side}.png`;
      if (!fs.existsSync(img)) continue;
      const meta = await sharp(img).metadata();
      const topBuffer = await sharp(img).extract({ left: 0, top: 0, width: meta.width, height: 350 }).toBuffer();
      fs.writeFileSync('temp_top.png', topBuffer);
      try {
        const out = cp.execSync('"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" temp_top.png stdout -l ara --psm 6', { encoding: 'utf8' });
        console.log(pad, side, '->', out.replace(/\s+/g, ' ').trim());
      } catch (e) {
        console.error(e.message);
      }
    }
  }
}
run();
