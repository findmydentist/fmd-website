import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { MEDIA, media } from "./media.ts";

test("every media file exists at full resolution", () => {
  const all = Object.values(MEDIA);
  assert.ok(all.length >= 14);
  for (const m of all) {
    assert.ok(fs.existsSync("public" + m.src), `missing ${m.src}`);
    assert.ok(m.alt.trim(), `${m.key} has no alt`);
    assert.ok(m.credit.trim(), `${m.key} has no credit`);
    if (m.src.startsWith("/media/feed/") || m.src.startsWith("/media/clinics/")) assert.ok(Math.max(m.w, m.h) >= 1600, `${m.key} is ${m.w}x${m.h}`);
    if (m.src.startsWith("/media/moments/") || m.src.startsWith("/media/clips/")) assert.ok(m.h > m.w, `${m.key} should be portrait`);
  }
});

test("media() finds a key and refuses an unknown one", () => {
  const first = Object.keys(MEDIA)[0]!;
  assert.equal(media(first).key, first);
  assert.throws(() => media("no-such-photo"), /no-such-photo/);
});
