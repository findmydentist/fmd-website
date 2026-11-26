// Picture questions for FMD Scholar: downloads the clinical photos from Wikimedia Commons into public/media/scholar as
// WebP and prints their sizes for src/sample/scholar/pictures.ts. Run from web/: node scripts/fetch-scholar-images.mjs
// Only photos whose Commons description itself states the finding are used, so no question claims more than its source.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// 1280px thumbnails (cached, and far less rate-limited than originals); files narrower than that come as originals
const commons = (file) => `https://upload.wikimedia.org/wikipedia/commons/${file}`;
const thumb = (dir, name) => commons(`thumb/${dir}/${name}/1280px-${name}`);
const PHOTOS = [
  { key: "gingivitis-calculus", url: thumb("e/ee", "Gingivitis.jpg") },
  { key: "gingivitis-before-after", url: thumb("b/ba", "Gingivitis-before-and-after-3.jpg") },
  { key: "fluorosis-severe-caries", url: commons("a/a7/Severe_fluorosis.JPG") },
  { key: "fluorosis-mild", url: thumb("f/ff", "MildFluorosis02-24-09.jpg") },
  { key: "caries-perio-calculus", url: commons("2/22/Caries%2C_Periodontal_disease%2C_calculus.png") },
  { key: "black-triangles-implant", url: thumb("a/ac", "Black_triangles_large.jpg") },
];
const UA = { "user-agent": "fmd-media-fetch/1.0 (sample-data build)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, key) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA }).catch(() => null);
    if (res?.ok) return Buffer.from(await res.arrayBuffer());
    if (res && res.status !== 429 && res.status < 500) throw new Error(`${key}: HTTP ${res.status}`);
    await sleep((Number(res?.headers.get("retry-after")) || 5 * 2 ** i) * 1000);
  }
  throw new Error(`${key}: download failed`);
}

const dir = path.join("public", "media", "scholar");
fs.mkdirSync(dir, { recursive: true });
for (const p of PHOTOS) {
  const buf = await download(p.url, p.key);
  const info = await sharp(buf).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, `${p.key}.webp`));
  console.log(`${p.key}: w: ${info.width}, h: ${info.height}`);
  await sleep(1500);
}
