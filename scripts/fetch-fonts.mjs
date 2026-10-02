/**
 * Populates assets/fonts/ with static TTF files for the six bundled Arabic
 * families. Run with: npm run fonts
 *
 * Why static instances: React Native on Android resolves weight by *family
 * name*, not by a variable font axis, so shipping a variable font makes bold
 * render identically to regular. Some families in google/fonts are
 * variable-only, so those are passed through fontTools.varLib.instancer to
 * bake out wght=400 and wght=700.
 *
 * Requires: Node 18+, and `pip install fonttools` for the variable families.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'fonts');
const TMP_DIR = join(OUT_DIR, '.tmp');
const API = 'https://api.github.com/repos/google/fonts/contents/ofl';
const RAW = (dir, path) => `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/${path}`;

/** Static weight filenames we want per family, in order. */
const FAMILIES = [
  { dir: 'cairo', slug: 'Cairo', label: 'Cairo', wanted: ['Cairo-Regular.ttf', 'Cairo-Bold.ttf'] },
  { dir: 'amiri', slug: 'Amiri', label: 'Amiri', wanted: ['Amiri-Regular.ttf', 'Amiri-Bold.ttf'] },
  {
    dir: 'scheherazadenew',
    slug: 'ScheherazadeNew',
    label: 'Scheherazade',
    wanted: ['ScheherazadeNew-Regular.ttf', 'ScheherazadeNew-Bold.ttf'],
  },
  { dir: 'marhey', slug: 'Marhey', label: 'Marhey', wanted: ['Marhey-Regular.ttf', 'Marhey-Bold.ttf'] },
  { dir: 'katibeh', slug: 'Katibeh', label: 'Katibeh', wanted: ['Katibeh-Regular.ttf'] },
  { dir: 'rakkas', slug: 'Rakkas', label: 'Rakkas', wanted: ['Rakkas-Regular.ttf'] },
];

/** Maps our `-Regular` / `-Bold` output names onto an instancer weight. */
const WEIGHT_OF = { Regular: 400, Bold: 700 };

async function listDir(dir) {
  const res = await fetch(`${API}/${dir}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'helmenarnam-fonts' },
  });
  if (!res.ok) throw new Error(`list ofl/${dir} -> HTTP ${res.status}`);
  return res.json();
}

/** TTF files start with 0x00010000, or 'true' (Apple) / 'OTTO' (CFF). */
function assertFont(bytes, label) {
  const magic = bytes.subarray(0, 4).toString('hex');
  if (!['00010000', '74727565', '4f54544f'].includes(magic)) {
    throw new Error(`${label} is not a TTF (magic=${magic}) — probably an HTML error page`);
  }
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'helmenarnam-fonts' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  assertFont(bytes, url);
  return bytes;
}

/** Bake a single weight out of a variable font using fontTools. */
function instance(vfPath, outPath, weight) {
  try {
    execFileSync(
      'python',
      ['-m', 'fontTools.varLib.instancer', vfPath, `wght=${weight}`, '-o', outPath],
      { stdio: 'pipe' },
    );
  } catch (err) {
    const detail = (err.stderr?.toString() ?? err.message).split('\n').slice(-4).join('\n');
    throw new Error(`fontTools instancing failed for ${outPath}:\n${detail}`);
  }
}

async function main() {
  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  const manifest = [];

  for (const family of FAMILIES) {
    console.log(`${family.label}:`);
    const root = await listDir(family.dir);
    const rootFiles = root.filter((e) => e.type === 'file').map((e) => e.name);
    const hasStatic = root.some((e) => e.type === 'dir' && e.name === 'static');
    const statics = hasStatic ? (await listDir(`${family.dir}/static`)).map((e) => e.name) : [];
    const variable = rootFiles.find((f) => f.endsWith('.ttf') && f.includes('['));

    for (const name of family.wanted) {
      const outPath = join(OUT_DIR, name);
      const direct =
        rootFiles.find((f) => f.toLowerCase() === name.toLowerCase()) ??
        statics.find((f) => f.toLowerCase() === name.toLowerCase());

      if (direct) {
        const bytes = await download(RAW(family.dir, hasStatic && !rootFiles.includes(direct) ? `static/${direct}` : direct));
        await writeFile(outPath, bytes);
      } else if (variable) {
        // Variable-only family: download once, then instance each weight.
        const vfPath = join(TMP_DIR, variable.replace(/[^\w.-]/g, '_'));
        if (!(await readdir(TMP_DIR)).includes(vfPath.split(/[\\/]/).pop())) {
          await writeFile(vfPath, await download(RAW(family.dir, variable)));
        }
        instance(vfPath, outPath, WEIGHT_OF[/-Bold\.ttf$/.test(name) ? 'Bold' : 'Regular']);
      } else {
        throw new Error(`${family.slug}: no static file named ${name} and no variable font to instance`);
      }

      const { size } = await import('node:fs').then((fs) => fs.promises.stat(outPath));
      manifest.push({ file: name, family: family.label, slug: family.slug });
      console.log(`  ${name.padEnd(32)} ${(size / 1024).toFixed(0)} KB${direct ? '' : '  (instanced)'}`);
    }
  }

  await rm(TMP_DIR, { recursive: true, force: true });
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n${manifest.length} font files -> assets/fonts/manifest.json`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('font fetch failed:', err.message);
    process.exit(1);
  });
