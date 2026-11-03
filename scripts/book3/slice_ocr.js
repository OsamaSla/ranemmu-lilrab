const sharp = require('sharp');
const cp = require('child_process');
const fs = require('fs');

async function sliceAndOCR(filename) {
  const p = `assets/book3/split/${filename}`;
  const meta = await sharp(p).metadata();
  console.log(`\n=================== ${filename} (h=${meta.height}, w=${meta.width}) ===================`);
  const slices = 4;
  const sliceH = Math.floor(meta.height / slices);
  for (let i = 0; i < slices; i++) {
    const top = i * sliceH;
    const buf = await sharp(p).extract({ left: 0, top, width: meta.width, height: sliceH }).toBuffer();
    fs.writeFileSync('temp_slice.png', buf);
    const out = cp.execSync('"C:\\Program Files\\Tesseract-OCR\\tesseract.exe" temp_slice.png stdout -l ara --psm 6', { encoding: 'utf8' });
    console.log(`--- Slice ${i+1} (top=${top}) ---`);
    console.log(out.trim());
  }
}

async function main() {
  await sliceAndOCR('spread_138_left.png');
  await sliceAndOCR('spread_139_right.png');
}
main();
