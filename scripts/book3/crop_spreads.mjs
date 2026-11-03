import sharp from 'sharp';
import fs from 'fs';

const start = parseInt(process.argv[2] || '86', 10);
const end = parseInt(process.argv[3] || '95', 10);

async function cropSpreads() {
  if (!fs.existsSync('scratch_crops')) {
    fs.mkdirSync('scratch_crops', { recursive: true });
  }

  for (let i = start; i <= end; i++) {
    const pad = String(i).padStart(3, '0');
    for (const side of ['left', 'right']) {
      const file = `assets/book3/split/spread_${pad}_${side}.png`;
      if (!fs.existsSync(file)) {
        console.log(`Skipping missing file: ${file}`);
        continue;
      }
      const meta = await sharp(file).metadata();
      const mid = Math.floor(meta.height / 2);

      await sharp(file)
        .extract({ left: 0, top: 0, width: meta.width, height: mid })
        .toFile(`scratch_crops/${i}_${side}_t.png`);

      await sharp(file)
        .extract({ left: 0, top: mid, width: meta.width, height: meta.height - mid })
        .toFile(`scratch_crops/${i}_${side}_b.png`);
    }
    console.log(`Cropped spread ${i}`);
  }
  console.log(`Finished cropping spreads ${start}-${end}`);
}

cropSpreads();
