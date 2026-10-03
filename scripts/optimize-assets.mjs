import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';

// Source art lives in art-source/ (not deployed). This script writes the
// right-sized copies the game actually downloads into public/.
const size = async (path) => (await stat(path)).size;
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

async function backgrounds() {
  let original = 0, optimized = 0;
  await mkdir('public/assets/backgrounds', { recursive: true });
  for (const file of await readdir('art-source/backgrounds')) {
    if (!file.endsWith('.png')) continue;
    const source = `art-source/backgrounds/${file}`;
    const target = `public/assets/backgrounds/${file.replace(/\.png$/, '.webp')}`;
    await sharp(source).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
    original += await size(source);
    optimized += await size(target);
  }
  console.log(`Backgrounds: ${mb(original)} -> ${mb(optimized)}`);
}

// The game canvas is 960x540 and the hero is drawn about 140px tall, so a
// 320px texture is still twice the drawn size. Huge textures also alias when
// WebGL shrinks them without mipmaps, so smaller files look smoother too.
const SPRITE_HEIGHT = 320;

async function removeWhiteMatte(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const visit = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    const p = index * 4;
    const darkest = Math.min(data[p], data[p + 1], data[p + 2]);
    const lightest = Math.max(data[p], data[p + 1], data[p + 2]);
    if (darkest < 210 || lightest - darkest > 20) return;
    data[p + 3] = 0;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < count - width) visit(index + width);
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function sprites() {
  let original = 0, optimized = 0;
  await mkdir('public/assets/sprites', { recursive: true });
  const jobs = [
    ['corn-wukong-clean-idle.png', 'corn-wukong-clean-idle.png'],
    ['corn-wukong-clean-run.png', 'corn-wukong-clean-run.png'],
    ['corn-wukong-clean-attack.png', 'corn-wukong-clean-attack.png'],
    // The crouch drawing has a white background; cut it out once here
    // instead of flood-filling a 1254px image on every phone at startup.
    ['corn-wukong-crouch-source.png', 'corn-wukong-clean-crouch.png', true]
  ];
  for (const [from, to, matte] of jobs) {
    const source = `art-source/sprites/${from}`;
    const target = `public/assets/sprites/${to}`;
    const input = matte ? await removeWhiteMatte(source) : source;
    await sharp(input).resize({ height: SPRITE_HEIGHT }).png({ compressionLevel: 9, palette: false }).toFile(target);
    original += await size(source);
    optimized += await size(target);
  }
  console.log(`Hero sprites: ${mb(original)} -> ${mb(optimized)}`);
}

async function icons() {
  await mkdir('public/icons', { recursive: true });
  const hero = 'art-source/sprites/corn-wukong-clean-idle.png';
  const background = (px, round) => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">
      <defs><radialGradient id="g" cx="50%" cy="38%" r="70%">
        <stop offset="0" stop-color="#fff3a6"/><stop offset="0.55" stop-color="#ffc94a"/><stop offset="1" stop-color="#e98a1c"/>
      </radialGradient></defs>
      <rect width="${px}" height="${px}" rx="${round ? px * 0.22 : 0}" fill="url(#g)"/>
    </svg>`
  );
  const make = async (px, file, { round = false, heroScale = 0.82 } = {}) => {
    const heroPx = Math.round(px * heroScale);
    const art = await sharp(hero).resize({ height: heroPx, width: heroPx, fit: 'contain', background: '#00000000' }).toBuffer();
    await sharp(background(px, round))
      .composite([{ input: art, gravity: 'center' }])
      .png()
      .toFile(`public/icons/${file}`);
  };
  await make(192, 'icon-192.png', { round: true });
  await make(512, 'icon-512.png', { round: true });
  // Maskable icons are cropped to a circle by Android; keep the hero inside the safe zone.
  await make(512, 'icon-maskable-512.png', { heroScale: 0.62 });
  await make(180, 'apple-touch-icon.png');
  console.log('Icons: 192, 512, maskable 512, apple-touch 180');
}

await backgrounds();
await sprites();
await icons();
