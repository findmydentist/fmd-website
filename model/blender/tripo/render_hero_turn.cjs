// The hero's rising mascot as a turntable for phones (Mascot3D's scroll-driven spin, shown as frames instead of a live
// canvas): one full turn of the full-quality model in the hero's own studio, camera and framing, transparent, as
// lossless PNGs → FRAMES/0000.png … (STEPS of them, frame i = i × 360/STEPS degrees). hero_turn.py crops and encodes them.
//
//   node model/blender/tripo/render_hero_turn.cjs     (needs playwright-core and Google Chrome; uses the GPU)
//   PLAYWRIGHT=/path/to/playwright-core CHROME=/usr/bin/google-chrome FRAMES=/some/dir
//
// The lights and softboxes are read from web/src/components/hero/Mascot3D.tsx, so the frames match the live hero.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const WEB = path.join(ROOT, "web");
const FRAMES = process.env.FRAMES || path.join(require("os").tmpdir(), "hero-turn");
const STEPS = Number(process.env.STEPS || 120);
const H = Number(process.env.SIZE || 1080); // output height; the canvas is 1.7 : 1 (Hero.tsx: 170% of the mascot box)
const SS = 3; // rendered at SS× and downscaled: supersampled edges
const { chromium } = require(process.env.PLAYWRIGHT || "playwright-core");

const src = fs.readFileSync(path.join(WEB, "src/components/hero/Mascot3D.tsx"), "utf8");
const nums = (s) => JSON.parse(s.replace(/\s/g, ""));
const amb = src.match(/<ambientLight intensity=\{([\d.]+)\} color="(#\w+)"/);
const hemi = src.match(/<hemisphereLight args=\{\["(#\w+)", "(#\w+)", ([\d.]+)\]\}/);
const dirs = [...src.matchAll(/<directionalLight position=\{(\[[^\]]+\])\} intensity=\{([\d.]+)\} color="(#\w+)"/g)].map((m) => [nums(m[1]), +m[2], m[3]]);
const forms = [...src.matchAll(/<Lightformer form="rect" intensity=\{([\d.]+)\} position=\{(\[[^\]]+\])\} scale=\{(\[[^\]]+\])\}(?: color="(#\w+)")?/g)].map((m) => [nums(m[2]), nums(m[3]), +m[1], m[4] || "#ffffff"]);
const cam = src.match(/camera=\{\{ position: (\[[^\]]+\]), fov: (\d+) \}\}/);
const exposure = +src.match(/gl\.toneMappingExposure = ([\d.]+)/)[1];
if (!amb || !hemi || dirs.length < 5 || forms.length < 4 || !cam) throw new Error("couldn't read the studio from Mascot3D.tsx");
const STUDIO = { amb: [amb[2], +amb[1]], hemi: [hemi[1], hemi[2], +hemi[3]], dirs, forms, cam: [nums(cam[1]), +cam[2]], exposure };

const html = `<!doctype html><html><body style="margin:0">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
const S = ${JSON.stringify(STUDIO)}, OUT_H = ${H}, RH = ${H * SS}, ASPECT = 1.7, STEPS = ${STEPS};
const RW = Math.round(RH * ASPECT);
const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
gl.setSize(RW, RH);
gl.toneMapping = THREE.NeutralToneMapping;
gl.toneMappingExposure = S.exposure;
// R3F's default camera: placed, then aimed at the origin
const camera = new THREE.PerspectiveCamera(S.cam[1], ASPECT, 0.1, 1000);
camera.position.set(...S.cam[0]);
camera.lookAt(0, 0, 0);
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(S.amb[0], S.amb[1]));
scene.add(new THREE.HemisphereLight(S.hemi[0], S.hemi[1], S.hemi[2]));
for (const [p, i, c] of S.dirs) { const d = new THREE.DirectionalLight(c, i); d.position.set(...p); scene.add(d); }
// drei's <Environment> of <Lightformer>s: emissive planes facing the origin, captured into a cube map
const env = new THREE.Scene();
for (const [p, sc, i, c] of S.forms) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }));
  m.material.color.set(c).multiplyScalar(i);
  m.scale.set(...sc); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
}
const rt = new THREE.WebGLCubeRenderTarget(256);
rt.texture.type = THREE.HalfFloatType;
const cc = new THREE.CubeCamera(0.1, 1000, rt);
env.add(cc);
cc.update(gl, env);
scene.environment = rt.texture;
const model = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("/model.glb")).scene;
// textures at full anisotropy: crisp eyes and brows where the face turns away
const aniso = gl.capabilities.getMaxAnisotropy();
model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; for (const t of [o.material.map, o.material.normalMap, o.material.roughnessMap, o.material.clearcoatNormalMap]) if (t) { t.anisotropy = aniso; t.needsUpdate = true; } } });
const turn = new THREE.Group(); // Mascot3D's group: its rotation.y is the scroll-driven spin
turn.add(model);
scene.add(turn);
const small = document.createElement("canvas");
small.width = Math.round(OUT_H * ASPECT); small.height = OUT_H;
const ctx = small.getContext("2d");
ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
for (let i = 0; i < STEPS; i++) {
  turn.rotation.y = THREE.MathUtils.degToRad((i * 360) / STEPS);
  gl.render(scene, camera);
  ctx.clearRect(0, 0, small.width, small.height);
  ctx.drawImage(gl.domElement, 0, 0, small.width, small.height);
  const png = await new Promise((r) => small.toBlob(r, "image/png"));
  await fetch("/frame?f=" + String(i).padStart(4, "0") + ".png", { method: "POST", body: png });
}
window.DONE = 1;
</script></body></html>`;

(async () => {
  fs.mkdirSync(FRAMES, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--use-angle=gl-egl", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const p = await b.newPage();
  p.on("pageerror", (e) => {
    console.error("PAGEERR", e.message);
    process.exit(1);
  });
  await p.route("http://turn/**", (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/") return r.fulfill({ body: html, contentType: "text/html" });
    if (u.pathname === "/frame") {
      fs.writeFileSync(path.join(FRAMES, u.searchParams.get("f")), r.request().postDataBuffer());
      return r.fulfill({ body: "ok" });
    }
    if (u.pathname === "/model.glb") return r.fulfill({ path: path.join(WEB, "public/mascot-sitting-raw.glb"), contentType: "model/gltf-binary" });
    if (u.pathname.startsWith("/three/")) return r.fulfill({ path: path.join(WEB, "node_modules", u.pathname), contentType: "text/javascript" });
    r.fulfill({ status: 404, body: "" });
  });
  await p.goto("http://turn/");
  await p.waitForFunction(() => window.DONE, null, { timeout: 900000, polling: 500 });
  await b.close();
  console.log(`${STEPS} frames → ${FRAMES}`);
})();
