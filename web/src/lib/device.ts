/**
 * Phones and low-memory devices (narrow screen, or the browser reports ≤ 4 GB) load the lighter model builds: the hero's
 * mascot-sitting-raw-mobile.glb, models/rig-mobile/ and models/assistant-mobile.glb (same look, ~half the triangles;
 * desktops keep the originals). Always false on the server: only file paths differ, and the markup never shows them.
 */
export const LIGHT_DEVICE =
  typeof window !== "undefined" &&
  (window.matchMedia("(max-width: 767px)").matches || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4);

/** A section mascot's path under web/public: the phone build on light devices. */
export const rigPath = (name: string) => `/models/${LIGHT_DEVICE ? "rig-mobile" : "rig"}/${name}.glb`;

/** Touch-first devices (phones, tablets): the hero's rising mascot is a turntable of frames there (hero/HeroTurn.tsx).
 *  The primary pointer only: Samsung Internet (e.g. Galaxy Fold) reports hover and a fine pointer as available with just
 *  the touchscreen, so "(hover: none) and (pointer: coarse)" missed it and it got the desktop path (live WebGL mascots,
 *  which its Adreno GPU renders as silver chrome). Touch laptops keep a fine primary pointer, so they stay desktop. */
export const TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Graphics drawn in software (no usable GPU: a VM, a remote desktop, a missing driver), where live 3D and full-screen
 * page animations cost seconds of frozen page. Such browsers get the mascots' videos instead of WebGL (MascotArt's
 * VIDEOS) and no page animation (PageTransition). Firefox hides the renderer's name, so it's never flagged there.
 */
export const SLOW_GPU =
  typeof window !== "undefined" &&
  (() => {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return true;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext(); // free the probe's context straight away
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch {
      return false;
    }
  })();
