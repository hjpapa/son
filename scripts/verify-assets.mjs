import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

const mapping = JSON.parse(await readFile('src/game/data/character-art.json', 'utf8'));
const themes = ['cornfield','cave','palace','skywar','mountain','farm','river','wind','forest','swamp','gold','ending'];
const sprites = ['clean','golden'].flatMap(kind=>['idle','run','attack','crouch'].map(pose=>`corn-wukong-${kind}-${pose}`));
const images = [
  ...themes.map(key=>({path:`public/assets/backgrounds/${key}.webp`,alpha:false})),
  ...sprites.map(key=>({path:`public/assets/sprites/${key}.webp`,alpha:true})),
  ...[...mapping.travelers,...mapping.legends].map(key=>({path:`public/assets/characters/${key}.webp`,alpha:true}))
];
let bytes=0;
for(const image of images) {
  const metadata=await sharp(image.path).metadata();
  if(!metadata.width || !metadata.height) throw new Error(`Invalid image: ${image.path}`);
  if(image.alpha) {
    const stats=await sharp(image.path).stats();
    if(!metadata.hasAlpha || stats.channels[3].min!==0 || stats.channels[3].max<250) throw new Error(`Missing transparent cutout: ${image.path}`);
  }
  bytes+=(await stat(image.path)).size;
}
console.log(`Verified ${themes.length} backgrounds, ${sprites.length} hero poses and ${mapping.travelers.length+mapping.legends.length} characters (${(bytes/1048576).toFixed(2)} MiB).`);
