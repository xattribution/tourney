// Generates PWA PNG icons from an inline SVG using sharp.
// Run via `npm run icons`. Output goes to ./public.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// `pad` is the inner margin fraction — bigger for maskable icons so the motif
// stays inside the platform safe zone.
function svg(pad) {
  const s = 512;
  const m = Math.round(s * pad);
  const inner = s - m * 2;
  const x = m, y = m, w = inner, h = inner;
  const cx = s / 2, cy = s / 2;
  const r = inner * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="#0b0b0c"/>
    <g fill="none" stroke="#fafafa" stroke-width="${inner * 0.05}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${inner * 0.12}"/>
      <line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + h}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${inner * 0.05}" fill="#fafafa"/>
  </svg>`;
}

const jobs = [
  { name: 'icon-192.png', size: 192, pad: 0.18 },
  { name: 'icon-512.png', size: 512, pad: 0.18 },
  { name: 'icon-maskable-512.png', size: 512, pad: 0.28 },
  { name: 'apple-touch-icon.png', size: 180, pad: 0.16 },
];

for (const j of jobs) {
  await sharp(Buffer.from(svg(j.pad)))
    .resize(j.size, j.size)
    .png()
    .toFile(join(pub, j.name));
  console.log('wrote', j.name);
}
