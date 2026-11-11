import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MODEL_URLS, VIDEOS, loadVideos, videoCount } from "./MascotArt";
import { ASSISTANT_URL } from "./hero/AssistantMascot";
import { TOUCH } from "@/lib/device";

/**
 * Fetch and parse every 3D model on the home page into drei's cache, so each one appears the moment it scrolls into
 * view. Progress comes from three's shared loading manager (it counts the hero mascot too, which its own module
 * queues as soon as it's imported). Resolves when everything has loaded. Touch devices load the hero's turntable frames
 * instead of its model, and phones the section mascots' videos (MascotArt).
 */
export function preloadModels(onProgress: (fraction: number) => void): Promise<void> {
  const urls = [...(VIDEOS ? [] : [ASSISTANT_URL]), ...MODEL_URLS]; // phones: the assistant's mood videos instead
  // the bar: each part's share by its rough size in MB (a model ~1, the hero's frames 7.3, a video ~1.6)
  const parts: { w: number; f: number }[] = [];
  const part = (w: number) => {
    const p = { w, f: 0 };
    parts.push(p);
    return (f: number) => {
      p.f = f;
      onProgress(parts.reduce((s, x) => s + x.w * x.f, 0) / parts.reduce((s, x) => s + x.w, 0));
    };
  };
  const modelBar = part(urls.length + (TOUCH ? 0 : 3));
  const frameBar = TOUCH ? part(7.3) : null;
  const videoBar = videoCount() ? part(1.6 * videoCount()) : null;
  const frames = frameBar && import("./hero/HeroTurn").then((m) => m.loadFrames(frameBar));
  const videos = videoBar && loadVideos(videoBar);
  const models = new Promise<void>((resolve) => {
    if (!urls.length) return resolve(); // Android: every model is a video or the hero's frames
    const m = THREE.DefaultLoadingManager;
    m.onProgress = (_url, loaded, total) => {
      modelBar(total ? loaded / total : 0);
      if (total > urls.length && loaded === total) resolve();
    };
    m.onLoad = () => resolve();
    m.onError = () => resolve(); // a failed model just keeps its artwork; never hold the page
    if (!TOUCH) void import("./hero/Mascot3D");
    urls.forEach((url) => useGLTF.preload(url));
  });
  return Promise.all([models, frames, videos]).then(() => {});
}
