const sharp = require('sharp');
const cp = require('child_process');
const fs = require('fs');

async function checkOval(filename, top = 50, height = 250) {
  const p = `assets/book3/split/${filename}`;
  const meta = await sharp(p).metadata();
  const buf = await sharp(p).extract({ left: Math.floor(meta.width * 0.3), top, width: Math.floor(meta.width * 0.4), height }).toBuffer();
  fs.writeFileSync('temp_oval.png', buf);
  const out = cp.execSync('"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" temp_oval.png stdout --psm 6', { encoding: 'utf8' });
  console.log(`${filename} center top:`, out.trim());
}

async function main() {
  await checkOval('spread_135_right.png');
  await checkOval('spread_135_left.png');
  await checkOval('spread_136_right.png');
  await checkOval('spread_136_left.png');
  await checkOval('spread_137_right.png');
  await checkOval('spread_137_left.png');
  await checkOval('spread_138_right.png');
  await checkOval('spread_138_left.png');
  await checkOval('spread_139_right.png');
  await checkOval('spread_139_left.png');
}
main();
