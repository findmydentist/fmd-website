"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/**
 * Touch devices: the hero's rising mascot as one full turn of frames, drawn into a plain 2D canvas and picked by the same
 * scroll-driven angle that turns the live model (Mascot3D's rotY). The frames are the full-quality model in Mascot3D's own
 * studio and framing, supersampled (model/blender/tripo/render_hero_turn.cjs, cropped and encoded by hero_turn.py):
 * sharper than a phone's live canvas, no WebGL, and the same on iPhones. Bump V when the frames are re-rendered.
 */
const STEPS = 120; // one every 3°
const V = 1;
// where the cropped frames sit in the 1.7 : 1 canvas (hero_turn.py prints it), and the canvas width that draws them 1:1
const CROP = { l: 408 / 1836, t: 26 / 1080, w: 1021 / 1836, h: 1054 / 1080 };
const MAX_W = 1836;
const url = (i: number) => `/models/hero-turn/${String(i).padStart(3, "0")}.webp?v=${V}`;
const frameOf = (deg: number) => Math.round((((deg % 360) + 360) % 360) / (360 / STEPS)) % STEPS;
const gap = (a: number, b: number) => Math.min(Math.abs(a - b), STEPS - Math.abs(a - b));

// Every frame, compressed (~7 MB): frame 0 first (the pose it starts and ends in), then coarse to fine, so any angle
// soon has one near it. Loaded once per page, by the loading screen (preloadModels) or the first HeroTurn; the first
// frames of the rise are decoded too, so it starts without a decode.
const blobs: (Blob | undefined)[] = [];
const arrived = new Set<() => void>();
const ORDER = [...new Set([24, 12, 6, 3, 1].flatMap((step) => Array.from({ length: STEPS / step }, (_, k) => k * step)))];
let loading: Promise<void> | null = null;
export function loadFrames(onProgress?: (fraction: number) => void) {
  if (onProgress) arrived.add(() => onProgress(blobs.filter(Boolean).length / STEPS));
  loading ??= (async () => {
    const queue = [...ORDER];
    const worker = async () => {
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
        try {
          const r = await fetch(url(i));
          if (r.ok) blobs[i] = await r.blob();
        } catch {} // a missing frame: its neighbours stand in
        arrived.forEach((f) => f());
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    for (let i = 0; i < KEEP; i++) if (blobs[i]) await decode(i); // scrolling down turns it 0° → 3° → …
  })();
  return loading;
}

// Decoded frames (~4 MB each): only the last few, most recent last; a phone can't hold all 120
const KEEP = 12;
const decoded = new Map<number, ImageBitmap>();
const decoding = new Map<number, Promise<ImageBitmap | null>>();
function decode(i: number) {
  const hit = decoded.get(i);
  if (hit) {
    decoded.delete(i);
    decoded.set(i, hit);
    return Promise.resolve(hit);
  }
  let p = decoding.get(i);
  if (!p) {
    p = createImageBitmap(blobs[i]!).then(
      (b) => {
        decoding.delete(i);
        decoded.set(i, b);
        for (const [k, old] of decoded) {
          if (decoded.size <= KEEP) break;
          decoded.delete(k);
          old.close();
        }
        return b;
      },
      () => (decoding.delete(i), null),
    );
    decoding.set(i, p);
  }
  return p;
}

export default function HeroTurn({ rotY, onReady }: { rotY: MotionValue<number>; onReady: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const want = useRef(-1); // the frame being decoded for the current angle
  const shown = useRef(-1); // the frame on the canvas
  const last = useRef(0); // the previous angle: which way it is turning

  const paint = (i: number, b: ImageBitmap) => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(b, CROP.l * c.width, CROP.t * c.height, CROP.w * c.width, CROP.h * c.height);
    if (shown.current < 0) onReady();
    shown.current = i;
  };
  // the frame for this angle, or the nearest one loaded; while it decodes, the nearest decoded one stays up
  const show = (deg: number) => {
    const dir = deg >= last.current ? 1 : -1;
    last.current = deg;
    const at = frameOf(deg);
    let j = -1;
    for (let d = 0; d <= STEPS / 2 && j < 0; d++) j = blobs[(at + d) % STEPS] ? (at + d) % STEPS : blobs[(at - d + STEPS) % STEPS] ? (at - d + STEPS) % STEPS : -1;
    if (j < 0 || j === shown.current) return;
    want.current = j;
    const hit = decoded.get(j);
    if (hit) paint(j, hit);
    else {
      let near: number | null = null;
      for (const k of decoded.keys()) if (near === null || gap(k, j) < gap(near, j)) near = k;
      if (near !== null && near !== shown.current && (shown.current < 0 || gap(near, j) < gap(shown.current, j))) paint(near, decoded.get(near)!);
      void decode(j).then((b) => b && want.current === j && paint(j, b));
    }
    // then the next few frames in the direction it is turning, decoded ahead so the spin never waits on one
    for (let k = 1; k <= 3; k++) {
      const n = (j + dir * k + STEPS) % STEPS;
      if (blobs[n] && !decoded.has(n)) void decode(n);
    }
  };

  useMotionValueEvent(rotY, "change", show);

  useEffect(() => {
    const c = canvas.current!;
    // drawn at the screen's resolution (capped at the frames' own): the box before the rise's CSS scale
    const ro = new ResizeObserver(() => {
      const w = Math.min(Math.round(c.offsetWidth * devicePixelRatio), MAX_W);
      const h = Math.round((w * c.offsetHeight) / Math.max(c.offsetWidth, 1));
      if (w === c.width && h === c.height) return;
      c.width = w;
      c.height = h; // clears it: repaint
      const i = shown.current;
      if (i >= 0) void decode(i).then((b) => b && shown.current === i && paint(i, b));
    });
    ro.observe(c);
    const onArrive = () => show(rotY.get());
    arrived.add(onArrive);
    void loadFrames().then(onArrive);
    onArrive();
    return () => {
      ro.disconnect();
      arrived.delete(onArrive);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paint/show only read refs and module state
  }, [rotY]);

  return <canvas ref={canvas} aria-hidden className="hero-turn-float absolute inset-0 size-full" />;
}
