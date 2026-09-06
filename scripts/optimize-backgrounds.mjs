import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';

let original = 0, optimized = 0;
for (const file of await readdir('public/assets/backgrounds')) {
  if (!file.endsWith('.png')) continue;
  const source = `public/assets/backgrounds/${file}`;
  const target = source.replace(/\.png$/, '.webp');
  original += (await stat(source)).size;
  await sharp(source).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
  optimized += (await stat(target)).size;
}
console.log(`Backgrounds: ${(original / 1048576).toFixed(1)} MB -> ${(optimized / 1048576).toFixed(1)} MB`);
