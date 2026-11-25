// Builds FMD Main's sample media library: downloads CC0 / public-domain photos from Wikimedia Commons, writes
// full-resolution WebP into public/media/{feed,clinics}, portrait crops into public/media/{moments,clips}, and
// regenerates src/sample/media.ts with the real sizes. Run from web/: node scripts/fetch-media.mjs
// To add a photo: put it in PHOTOS (any https URL you may use under its licence), run the script, commit the files.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const commons = (file) => `https://upload.wikimedia.org/wikipedia/commons/${file}`;
const PHOTOS = [
  { key: "kid-checkup", folder: "feed", url: commons("1/1c/Zuba%C5%99-%C5%A1kola.jpg"), alt: "A young patient during a gentle check-up", credit: "Michal Jarmoluk · CC0 · Wikimedia Commons" },
  { key: "teeth-closeup", folder: "feed", url: commons("9/98/Teeth-887338.jpg"), alt: "Close-up of healthy, even front teeth", credit: "Hung Diesel · CC0 · Wikimedia Commons" },
  { key: "toothbrush", folder: "feed", url: commons("b/b9/Toothbrush%2C_Toothpaste%2C_Dental_Care_%28571741%29.jpg"), alt: "Toothpaste on a toothbrush", credit: "Steve Buissinne · CC0 · Wikimedia Commons" },
  { key: "xray-implant", folder: "feed", url: commons("1/1b/Dental_X-ray106.JPG"), alt: "Dental X-ray showing an implant", credit: "Werneuchen · Public domain · Wikimedia Commons" },
  { key: "students-group", folder: "feed", url: commons("7/71/MBBS_Students_of_Father_Muller_Medical_College.jpg"), alt: "A group of smiling students", credit: "Roseli1990 · CC0 · Wikimedia Commons" },
  { key: "smile-1", folder: "feed", url: commons("8/86/Smiling_woman_pink_shirt.jpg"), alt: "A woman laughing with a bright smile", credit: "Joshua McKnight · CC0 · Wikimedia Commons" },
  { key: "smile-2", folder: "feed", url: commons("7/71/Woman_in_cardigan.jpg"), alt: "A smiling woman in a dark cardigan", credit: "Christina Morillo · CC0 · Wikimedia Commons" },
  { key: "smile-3", folder: "feed", url: commons("b/b3/Woman_wearing_gray_and_black_plunge_sleeveless_top.jpg"), alt: "A woman with glasses smiling", credit: "Christina Morillo · CC0 · Wikimedia Commons" },
  { key: "smile-4", folder: "feed", url: commons("6/66/Closed_eye_smile_%28Unsplash%29.jpg"), alt: "A young woman smiling outdoors", credit: "Marcelo Matarazzo · CC0 · Wikimedia Commons" },
  { key: "family-smile", folder: "feed", url: commons("2/29/Absence_and_presence_of_teeth.jpg"), alt: "A grandfather and grandson smiling together", credit: "Sindugab · CC0 · Wikimedia Commons" },
  { key: "instruments", folder: "clinics", url: commons("e/e6/Dentist_tool_-_dental_equipment_01.jpg"), alt: "Sterilised dental instruments laid out in trays", credit: "Neva79 · CC0 · Wikimedia Commons" },
  { key: "implant-surgery", folder: "clinics", url: commons("d/dd/Dr.Ihab_Hanna_teaching_in_a_dental_implants_live_surgeries_Course.jpg"), alt: "A surgical team placing an implant", credit: "RWC Implant Study Club · CC0 · Wikimedia Commons" },
  { key: "lab-desk", folder: "clinics", url: commons("f/f8/20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg"), alt: "A dental clinic workstation", credit: "Rakoon · CC0 · Wikimedia Commons" },
];
/** Portrait 9:16 crops for Moments (stories) and Clips, cut from the photos above. */
const MOMENTS = ["smile-1", "smile-2", "smile-3", "kid-checkup", "students-group", "implant-surgery", "teeth-closeup", "lab-desk"];
const CLIPS = ["kid-checkup", "implant-surgery", "toothbrush", "students-group", "smile-4"];

const UA = { "user-agent": "fmd-media-fetch/1.0 (sample-data build)" };
const out = (folder, key) => path.join("public", "media", folder, `${key}.webp`);
const entries = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wikimedia rate-limits bursts (HTTP 429): wait as asked, else back off, up to 6 tries. */
async function download(url, key) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA }).catch(() => null); // a dropped connection or DNS blip: try again
    if (!res) {
      await sleep(5000 * 2 ** i);
      continue;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${key}: HTTP ${res.status}`);
    await sleep((Number(res.headers.get("retry-after")) || 5 * 2 ** i) * 1000);
  }
  throw new Error(`${key}: still rate-limited`);
}

for (const p of PHOTOS) {
  const buf = await download(p.url, p.key);
  await sleep(1500);
  fs.mkdirSync(path.join("public", "media", p.folder), { recursive: true });
  const info = await sharp(buf).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(out(p.folder, p.key));
  entries.push({ key: p.key, kind: "photo", src: `/media/${p.folder}/${p.key}.webp`, w: info.width, h: info.height, alt: p.alt, credit: p.credit });
  for (const [folder, list] of [["moments", MOMENTS], ["clips", CLIPS]]) {
    if (!list.includes(p.key)) continue;
    fs.mkdirSync(path.join("public", "media", folder), { recursive: true });
    const crop = await sharp(buf).rotate().resize(1080, 1920, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 80 }).toFile(out(folder, p.key));
    entries.push({ key: `${folder === "moments" ? "moment" : "clip"}-${p.key}`, kind: "photo", src: `/media/${folder}/${p.key}.webp`, w: crop.width, h: crop.height, alt: p.alt, credit: p.credit });
  }
  console.log("ok", p.key, `${info.width}x${info.height}`);
}

const body = entries.map((e) => `  ${JSON.stringify(e.key)}: ${JSON.stringify(e)},`).join("\n");
fs.writeFileSync(
  path.join("src", "sample", "media.ts"),
  `/**
 * FMD Main's sample media: local, full-resolution, free-licence photos (CC0 or public domain, credited below).
 * Generated by scripts/fetch-media.mjs: edit the list there and re-run, don't edit this file by hand.
 */

export type MediaKind = "photo" | "video";
export type Media = { key: string; kind: MediaKind; src: string; w: number; h: number; alt: string; poster?: string; credit: string };

export const MEDIA: Record<string, Media> = {
${body}
};

export function media(key: string): Media {
  const m = MEDIA[key];
  if (!m) throw new Error(\`Unknown media key: \${key}\`);
  return m;
}
`,
);
console.log(entries.length, "entries → src/sample/media.ts");
