// Converts the proofed PNG artwork into small and large WebP files for the app.
// Reads ../Proofed game assets/ (read-only) and writes public/assets/{sm,lg}/ID.webp
// plus the PWA icons. Run with `npm run assets`. Pass --force to rebuild everything.
import { readdir, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(root, '../Proofed game assets');
const OUT = path.join(root, 'public/assets');
const ICONS = path.join(root, 'public/icons');
const QUALITY = 80;
const force = process.argv.includes('--force');

// [sm width, lg width] by ID prefix (SPEC section 2, asset pipeline table).
function widthsFor(id) {
  if (id === 'X01') return [800, 1600];
  if (id === 'X02' || id === 'MAT') return [600, 1200];
  const prefix = id.match(/^[A-Z]+/)[0];
  if ('DJKNLMPSG'.includes(prefix) && prefix.length === 1) return [240, 720];
  if (prefix === 'B' || prefix === 'A') return [160, 480];
  if (['C', 'E', 'I', 'T', 'PP'].includes(prefix)) return [160, 480];
  if (prefix === 'Q') return [200, 600];
  throw new Error(`No size rule for ${id}`);
}

async function isFresh(out, srcMtime) {
  if (force) return false;
  try {
    return (await stat(out)).mtimeMs >= srcMtime;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(path.join(OUT, 'sm'), { recursive: true });
  await mkdir(path.join(OUT, 'lg'), { recursive: true });
  await mkdir(ICONS, { recursive: true });

  const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.png')).sort();
  const seen = new Map();
  const jobs = [];
  for (const file of files) {
    const id = file.slice(0, file.indexOf('-'));
    if (seen.has(id)) throw new Error(`Duplicate ID ${id}: ${seen.get(id)} and ${file}`);
    seen.set(id, file);
    const [sm, lg] = widthsFor(id);
    jobs.push({ id, file, sizes: { sm, lg } });
  }

  let written = 0;
  let skipped = 0;
  const queue = [...jobs];
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const src = path.join(SRC, job.file);
      const srcMtime = (await stat(src)).mtimeMs;
      for (const [size, width] of Object.entries(job.sizes)) {
        const out = path.join(OUT, size, `${job.id}.webp`);
        if (await isFresh(out, srcMtime)) {
          skipped++;
          continue;
        }
        await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
        written++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(2, os.cpus().length - 1) }, worker));

  // PWA icons from the square board centre art.
  const x01 = path.join(SRC, seen.get('X01'));
  for (const px of [192, 512]) {
    await sharp(x01).resize(px, px, { fit: 'cover' }).png().toFile(path.join(ICONS, `icon-${px}.png`));
  }

  console.log(`${jobs.length} images: ${written} WebP written, ${skipped} up to date. Icons: 192, 512.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
