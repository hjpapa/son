import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('src/game/data/character-art.json', 'utf8'));
await mkdir('public/assets/characters', { recursive: true });

// The generated sheets have irregular gutters. Segment connected silhouettes
// before assigning them to cells, so feet, tails and weapons are never clipped.
for (const [name, columns, rows] of [['travelers', 6, 6], ['legends', 3, 4]]) {
  const { data, info } = await sharp(`art-source/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0, tail = 0;
  const enqueueMatte = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    const p = index * 4;
    const rgb = [data[p], data[p + 1], data[p + 2]];
    if (data[p + 3] > 10 && (Math.min(...rgb) < 209 || Math.max(...rgb) - Math.min(...rgb) > 23)) return;
    data[p + 3] = 0;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { enqueueMatte(x); enqueueMatte((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { enqueueMatte(y * width); enqueueMatte(y * width + width - 1); }
  const neighbors = (index, enqueue) => {
    if (index % width) enqueue(index - 1);
    if (index % width < width - 1) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index < count - width) enqueue(index + width);
  };
  while (head < tail) neighbors(queue[head++], enqueueMatte);

  const labels = new Int32Array(count);
  const components = [];
  let id = 0;
  for (let seed = 0; seed < count; seed++) {
    if (labels[seed] || data[seed * 4 + 3] < 32) continue;
    id++;
    head = 0; tail = 0;
    let left = width, top = height, right = 0, bottom = 0;
    const enqueue = (index) => {
      if (labels[index] || data[index * 4 + 3] < 32) return;
      labels[index] = id; queue[tail++] = index;
    };
    enqueue(seed);
    while (head < tail) {
      const index = queue[head++];
      const x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      neighbors(index, enqueue);
    }
    if (tail > 600) components.push({ id, area: tail, left, top, right, bottom });
  }
  const slots = new Map();
  for (const component of components) {
    const column = Math.min(columns - 1, Math.floor((component.left + component.right) / 2 / width * columns));
    const row = Math.min(rows - 1, Math.floor((component.top + component.bottom) / 2 / height * rows));
    const slot = row * columns + column;
    if (!slots.has(slot) || slots.get(slot).area < component.area) slots.set(slot, component);
  }
  for (const [index, key] of manifest[name].entries()) {
    const c = slots.get(index);
    if (!c) throw new Error(`Missing silhouette: ${key}`);
    const w = c.right - c.left + 1, h = c.bottom - c.top + 1;
    const pixels = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const source = (y + c.top) * width + x + c.left;
      if (labels[source] !== c.id) continue;
      data.copy(pixels, (y * w + x) * 4, source * 4, source * 4 + 4);
    }
    await sharp(pixels, { raw: { width: w, height: h, channels: 4 } })
      .resize(176, 176, { fit: 'contain', background: '#00000000' })
      .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#00000000' })
      .png().toFile(`public/assets/characters/${key}.png`);
  }
}
console.log('Prepared 48 complete transparent character silhouettes.');
