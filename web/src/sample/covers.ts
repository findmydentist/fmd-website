/**
 * Your profile's cover picture (the wide one behind your photo, as on Facebook and LinkedIn): sample data until the
 * backend has it. Proposed API: PUT /me/cover (multipart image) → { url }, DELETE /me/cover. The demo keeps a resized
 * copy in this browser.
 */
import { read, write } from "./store";

const key = (userId: string) => `fmd-demo:cover:${userId}`;
/** the size it's stored at: 3 : 1, like the cover's box */
export const COVER = { w: 1500, h: 500 };
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 10;

export async function getCover(userId: string): Promise<string | null> {
  return read<string>(key(userId));
}

export async function removeCover(userId: string) {
  write(key(userId), null);
}

/** Checks the file, crops it to the cover's shape from the middle, and keeps it. Returns the picture to show. */
export async function saveCover(userId: string, file: File): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error("Choose a JPG, PNG or WebP picture.");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Choose a picture under ${MAX_MB} MB.`);
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error("That picture couldn't be opened. Try another one.");
  });
  const scale = Math.max(COVER.w / bmp.width, COVER.h / bmp.height);
  const sw = COVER.w / scale;
  const sh = COVER.h / scale;
  const canvas = document.createElement("canvas");
  canvas.width = COVER.w;
  canvas.height = COVER.h;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, COVER.w, COVER.h);
  bmp.close();
  const url = canvas.toDataURL("image/jpeg", 0.82);
  write(key(userId), url);
  return url;
}
