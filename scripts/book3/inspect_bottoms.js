const sharp = require('sharp');
const cp = require('child_process');
const fs = require('fs');

async function run() {
  for (const imgName of ['spread_138_left.png', 'spread_139_right.png']) {
    const img = `assets/book3/split/${imgName}`;
    const meta = await sharp(img).metadata();
    const bot = await sharp(img).extract({ left: 0, top: Math.floor(meta.height * 0.45), width: meta.width, height: Math.floor(meta.height * 0.55) }).toBuffer();
    fs.writeFileSync('temp_bot.png', bot);
    const out = cp.execSync('"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" temp_bot.png stdout -l ara --psm 6', { encoding: 'utf8' });
    console.log(`=== ${imgName} bottom ===\n`, out);
  }
}
run();
