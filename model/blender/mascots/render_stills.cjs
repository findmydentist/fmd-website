// Still pictures of the section mascots for touch devices (MascotArt shows them there instead of live 3D canvases,
// which phones can't run smoothly ×10): each model in its artwork's pose, in its studio, framed exactly as
// MascotModel frames it (FOV 20, fitted to a 1-unit box), with a transparent background.
//
//   node model/blender/mascots/render_stills.cjs        (needs playwright-core and Google Chrome)
//   PLAYWRIGHT=/path/to/playwright-core CHROME=/usr/bin/google-chrome  to override where they are
//   VIDEO=1 GPU=1 ONLY=guide FRAMES=/some/dir  video frames, see below
//
// The looks, turns and the glass shader are read from web/src/components/MascotModel.tsx, so the stills match the
// live models. Re-run after rebuilding the models or changing their looks (and bump STILL_V in MascotArt.tsx).
//
// VIDEO=1 renders each model's motion instead (MascotModel's MOTIONS, one exact loop: LOOPS) as lossless transparent
// PNG frames into FRAMES/<name>/, for encode_videos.sh (phones play those videos instead of live canvases).
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../../..");
const WEB = path.join(ROOT, "web");
const OUT = path.join(WEB, "public/models/stills");
const { chromium } = require(process.env.PLAYWRIGHT || "playwright-core");

// the Look literals and LOOKS map, evaluated (types stripped)
const src = fs.readFileSync(path.join(WEB, "src/components/MascotModel.tsx"), "utf8");
const block = src.slice(src.indexOf("const PORCELAIN: Look"), src.indexOf("const fileOf"));
const js = block
  .replace(/^const lookOf[^\n]*\n/m, "")
  .replace(/: Look\b/g, "")
  .replace(/: Record<string, Look>/g, "")
  .replace(/\(l\): Look =>/g, "(l) =>");
const [LOOKS, PORCELAIN] = new Function(`${js}; return [LOOKS, PORCELAIN];`)();
const VIDEO = !!process.env.VIDEO;
const FPS = 30; // the live canvases draw at ~30 a second
const FRAMES = process.env.FRAMES || path.join(require("os").tmpdir(), "mascot-frames");
// the motions and their loops, transpiled for the page
const ts = require(path.join(WEB, "node_modules/typescript"));
const motionSrc = src.slice(src.indexOf("type Turn ="), src.indexOf("\n};\n", src.indexOf("const MOTIONS")) + 4);
const motionJs = ts.transpileModule(motionSrc.replace(/export const/g, "const"), { compilerOptions: { target: 99 } }).outputText;
const glassPatch = src.slice(src.indexOf("function glassify"), src.indexOf("\n}\n", src.indexOf("function glassify")) + 3);

const SIZE = Number(process.env.SIZE || (VIDEO ? 1080 : 1200)); // px tall; phones show the boxes at up to ~300 css px × 3
const SS = 3; // rendered at SS× and downscaled: supersampled edges, cleaner than the live canvases
// WebP quality: 0.97 keeps the eye rims and saturated blues/reds clean at ~100 KB a still (1 = lossless, ~500 KB)
const QUALITY = Number(process.env.QUALITY || 0.97);
// ONLY=vault,reading  re-renders just those
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
// ASSISTANT=1 (with VIDEO=1): FMD AI's mascot instead (AssistantMascot), one video per mood: its clip from the GLB,
// looped `loops` times, at that mood's turn, framed as its canvas frames it, with a blink starting at each of `blinks`
// (live they come at random, every 2.2–5.7 s). ONLY=assistant-idle,…
const ASSISTANT = !!process.env.ASSISTANT;
const asrc = fs.readFileSync(path.join(WEB, "src/components/hero/AssistantMascot.tsx"), "utf8");
const TURNS = new Function(`return ${asrc.match(/const TURNS[^=]*=\s*(\{[^}]*\})/)[1]}`)();
const perShapeJs = ts.transpileModule(asrc.slice(asrc.indexOf("const MORPHS"), asrc.indexOf("class Animator")), { compilerOptions: { target: 99 } }).outputText;
const MOODS = {
  idle: { loops: 2, blinks: [1.4, 4.5, 8.1] },
  listening: { loops: 2, blinks: [1.2, 4.7, 6.9] },
  thinking: { loops: 2, blinks: [2.1, 6.4] },
  explaining: { loops: 2, blinks: [1.9, 5.6] },
};
const jobs = (
  ASSISTANT
    ? Object.entries(MOODS).map(([mood, m]) => ({ ...m, name: "assistant-" + mood, mood, turn: TURNS[mood], src: path.join(WEB, "public/models/assistant.glb"), look: PORCELAIN, aspect: 96 / 128 }))
    : Object.entries(LOOKS).map(([file, look]) => ({
        file,
        name: file.replace(".glb", ""),
        src: path.join(WEB, "public/models/rig", file),
        look,
        align: file === "tooth.glb" ? "center" : "bottom",
        aspect: file === "tooth.glb" ? 1000 / 716 : 1, // the Care Core's box is its artwork's shape
      }))
).filter((j) => !ONLY || ONLY.includes(j.name));

const html = `<!doctype html><html><body style="margin:0">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
${motionJs}
${perShapeJs}
${glassPatch.replace(/: THREE\.Object3D|: number|as THREE\.Mesh|as THREE\.Material|\(o as THREE\.Mesh\)/g, (m) => (m === "(o as THREE.Mesh)" ? "o" : ""))}
const J = ${JSON.stringify(jobs)}, H = ${SIZE * SS}, OUT_H = ${SIZE}, VIDEO = ${VIDEO}, FPS = ${FPS};
// a loop must end where it starts: every rhythm divides it
for (const j of J) {
  const m = MOTIONS[j.file], L = LOOPS[j.file];
  if (!VIDEO) break;
  if (j.mood) continue;
  if (!m || !L) continue; // no loop (the tooth stays live on phones): no video
  const a = m.bones?.(0.37) ?? [], b = m.bones?.(0.37 + L) ?? [];
  a.forEach(([, , v], i) => { if (Math.abs(v - b[i][2]) > 1e-9) throw new Error(j.file + " does not loop in " + L + "s"); });
  if (m.spin && Math.abs(Math.sin((m.spin * L) / 2)) > 1e-9) throw new Error(j.file + " spin does not loop");
  if (m.pulse && Math.abs(L / m.pulse[1] - Math.round(L / m.pulse[1])) > 1e-9) throw new Error(j.file + " pulse does not loop");
}
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
for (const [ji, j] of J.entries()) {
  if (VIDEO && !j.mood && !LOOPS[j.file]) continue;
  const L = j.look, W = Math.round(H * j.aspect);
  const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  gl.setSize(W, H);
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = L.exposure;
  const cam = new THREE.PerspectiveCamera(20, j.aspect, 0.1, 1000);
  cam.position.set(0, 0, 0.56 / Math.tan(THREE.MathUtils.degToRad(10)));
  // the assistant's canvas: its camera a little above, looking at the centre (react-three-fiber's default)
  if (j.mood) cam.position.set(0, 0.12, 0.68 / Math.tan(THREE.MathUtils.degToRad(10))), cam.lookAt(0, 0, 0);
  const gltf = await loader.loadAsync("/m/" + ji), s = gltf.scene;
  // textures filtered at full anisotropy, as the live canvases do: crisp eye rims, brows and glasses
  const aniso = gl.capabilities.getMaxAnisotropy();
  s.traverse((o) => { if (o.isMesh) for (const t of [o.material.map, o.material.normalMap, o.material.roughnessMap, o.material.clearcoatNormalMap]) if (t) { t.anisotropy = aniso; t.needsUpdate = true; } });
  if (L.glass) glassify(s, L.glass);
  if (!j.mood) s.rotation.y = THREE.MathUtils.degToRad(L.turn || 0);
  s.updateMatrixWorld(true);
  // the assistant: 1 unit tall, feet at -0.5, centred for turning about (AssistantMascot's fit); mascots: in a 1-unit box
  const b = new THREE.Box3().setFromObject(s), size = b.getSize(new THREE.Vector3()), k = 1 / (j.mood ? size.y : Math.max(size.x, size.y));
  s.scale.setScalar(k);
  const c = b.getCenter(new THREE.Vector3()).multiplyScalar(k);
  s.position.set(-c.x, j.align === "bottom" || j.mood ? -0.5 - b.min.y * k : -c.y, -c.z);
  if (j.mood) s.traverse((o) => { if (o.isMesh) o.frustumCulled = false; }); // skinned bounds are the bind pose's
  const scene = new THREE.Scene();
  const turn = new THREE.Group();
  turn.add(s);
  scene.add(turn);
  // the bones (rest pose, parent's turn in model space) and glowing materials, exactly as MascotModel moves them
  s.updateMatrixWorld(true);
  const inv = s.getWorldQuaternion(new THREE.Quaternion()).invert(), bones = new Map(), glow = [];
  s.traverse((o) => {
    if (o.isBone && o.parent) bones.set(o.name, { bone: o, rest: o.quaternion.clone(), parent: inv.clone().multiply(o.parent.getWorldQuaternion(new THREE.Quaternion())) });
    if (o.isMesh && o.material.emissiveIntensity) glow.push({ m: o.material, base: o.material.emissiveIntensity });
  });
  const motion = MOTIONS[j.file] || {}, q = new THREE.Quaternion(), pq = new THREE.Quaternion();
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const pose = (t) => {
    for (const { bone, rest } of bones.values()) bone.quaternion.copy(rest);
    for (const [name, axis, a] of motion.bones?.(t) ?? []) {
      const b = bones.get(name.replace(".", ""));
      if (!b) continue;
      q.setFromAxisAngle(AX[axis], a);
      b.bone.quaternion.premultiply(pq.copy(b.parent).invert().multiply(q).multiply(b.parent));
    }
    if (motion.spin) turn.rotation.y = (t * motion.spin) % TAU;
    if (motion.pulse) for (const { m, base } of glow) m.setValues({ emissiveIntensity: base * (1 + motion.pulse[0] * wave(t, motion.pulse[1])) });
  };
  // the assistant: its mood's clip and the blink layered over it (split per face shape, as AssistantMascot does)
  let n = VIDEO ? Math.round(LOOPS[j.file] * FPS) : 1, act = (t) => pose(t);
  if (j.mood) {
    const mixer = new THREE.AnimationMixer(s), clip = (name) => mixer.clipAction(perShape(gltf.animations.find((a) => a.name === name), s));
    const mood = clip(j.mood), blink = clip("blink"), D = mood.getClip().duration, B = blink.getClip().duration;
    mood.play();
    blink.play();
    turn.rotation.y = THREE.MathUtils.degToRad(j.turn);
    n = Math.round(j.loops * D * FPS);
    act = (t) => {
      mood.time = t % D;
      const at = j.blinks.find((x) => t >= x && t < x + B);
      blink.enabled = at !== undefined;
      blink.time = at === undefined ? 0 : t - at;
      mixer.update(0);
    };
    console.log(j.name + ": " + n + " frames (" + j.loops + " × " + D.toFixed(3) + " s), turn " + j.turn + "°");
  }
  if (L.ambient) scene.add(new THREE.AmbientLight(L.ambient[0], L.ambient[1]));
  if (L.ground) scene.add(new THREE.HemisphereLight("#000000", L.ground[0], L.ground[1]));
  for (const [p, i, col] of L.dirs) { const d = new THREE.DirectionalLight(col, i); d.position.set(...p); scene.add(d); }
  const env = new THREE.Scene();
  for (const [p, sc, i, col] of L.panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide }));
    m.material.color.set(col || "#ffffff").multiplyScalar(i);
    m.scale.set(...sc); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
  }
  if (L.dome) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false }));
    m.material.color.set(L.dome[0]).multiplyScalar(L.dome[1]); m.scale.setScalar(50); env.add(m);
  }
  const rt = new THREE.WebGLCubeRenderTarget(256);
  rt.texture.type = THREE.HalfFloatType;
  const cc = new THREE.CubeCamera(0.1, 1000, rt);
  env.add(cc);
  cc.update(gl, env);
  scene.environment = rt.texture;
  const small = document.createElement("canvas");
  small.width = Math.round(W * OUT_H / H); small.height = OUT_H;
  const ctx = small.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  for (let i = 0; i < n; i++) {
    if (VIDEO) act(i / FPS);
    gl.render(scene, cam);
    ctx.clearRect(0, 0, small.width, small.height);
    ctx.drawImage(gl.domElement, 0, 0, small.width, small.height);
    if (!VIDEO) {
      await fetch("/save?f=" + j.name + ".webp", { method: "POST", body: small.toDataURL("image/webp", ${QUALITY}) });
      break;
    }
    const png = await new Promise((r) => small.toBlob(r, "image/png"));
    await fetch("/frame?f=" + j.name + "/" + String(i).padStart(4, "0") + ".png", { method: "POST", body: png });
  }
  gl.dispose();
}
window.DONE = 1;
</script></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/google-chrome",
    // GPU=1: the machine's GPU (~50× faster, for VIDEO); otherwise software GL, as the stills were made
    args: process.env.GPU ? ["--use-angle=gl-egl", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const p = await b.newPage();
  p.on("pageerror", (e) => {
    console.error("PAGEERR", e.message);
    process.exit(1);
  });
  await p.route("http://stills/**", (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/") return r.fulfill({ body: html, contentType: "text/html" });
    if (u.pathname === "/save") {
      const f = path.join(OUT, u.searchParams.get("f"));
      fs.writeFileSync(f, Buffer.from(r.request().postData().split(",")[1], "base64"));
      console.log("wrote", path.relative(ROOT, f));
      return r.fulfill({ body: "ok" });
    }
    if (u.pathname === "/frame") {
      const f = path.join(FRAMES, u.searchParams.get("f"));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, r.request().postDataBuffer());
      if (f.endsWith("0000.png")) console.log("frames →", path.dirname(f));
      return r.fulfill({ body: "ok" });
    }
    if (u.pathname.startsWith("/m/")) {
      return r.fulfill({ path: jobs[parseInt(u.pathname.slice(3))].src, contentType: "model/gltf-binary" });
    }
    if (u.pathname.startsWith("/three/")) return r.fulfill({ path: path.join(WEB, "node_modules", u.pathname), contentType: "text/javascript" });
    r.fulfill({ status: 404, body: "" });
  });
  await p.goto("http://stills/");
  await p.waitForFunction(() => window.DONE, null, { timeout: 900000, polling: 500 });
  await b.close();
})();
