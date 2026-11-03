import sharp from 'sharp';
import fs from 'fs';

async function cropSpreads() {
  for (let i = 75; i <= 85; i++) {
    const pad = String(i).padStart(3, '0');
    for (const side of ['left', 'right']) {
      const file = `assets/book3/split/spread_${pad}_${side}.png`;
      if (!fs.existsSync(file)) continue;
      const meta = await sharp(file).metadata();
      const mid = Math.floor(meta.height / 2);

      await sharp(file)
        .extract({ left: 0, top: 0, width: meta.width, height: mid })
        .toFile(`scratch_crops/${i}_${side}_t.png`);

      await sharp(file)
        .extract({ left: 0, top: mid, width: meta.width, height: meta.height - mid })
        .toFile(`scratch_crops/${i}_${side}_b.png`);
    }
  }
  console.log('Finished cropping spreads 75-85');
}
cropSpreads();
