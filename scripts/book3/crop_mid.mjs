// Generate mid-seam crops (mid-250 to mid+250) for spreads to catch cross-midpoint text
import sharp from 'sharp';
import fs from 'fs';

const start = parseInt(process.argv[2] || '109', 10);
const end = parseInt(process.argv[3] || '145', 10);

async function cropMids() {
  if (!fs.existsSync('scratch_crops')) fs.mkdirSync('scratch_crops', { recursive: true });

  for (let i = start; i <= end; i++) {
    for (const side of ['left', 'right']) {
      const file = `assets/book3/split/spread_${String(i).padStart(3,'0')}_${side}.png`;
      if (!fs.existsSync(file)) { console.log(`Skip: ${file}`); continue; }
      const meta = await sharp(file).metadata();
      const mid = Math.floor(meta.height / 2);
      const top = Math.max(0, mid - 250);
      const height = Math.min(500, meta.height - top);
      await sharp(file)
        .extract({ left: 0, top, width: meta.width, height })
        .toFile(`scratch_crops/${i}_${side}_mid.png`);
    }
    console.log(`Mid-cropped spread ${i}`);
  }
  console.log(`Done mid-crops ${start}-${end}`);
}

cropMids();
