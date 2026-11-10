import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MODEL_URLS } from "./MascotArt";
import { ASSISTANT_URL } from "./hero/AssistantMascot";
import { TOUCH } from "@/lib/device";

/**
 * Fetch and parse every 3D model on the home page into drei's cache, so each one appears the moment it scrolls into
 * view. Progress comes from three's shared loading manager (it counts the hero mascot too, which its own module
 * queues as soon as it's imported). Resolves when everything has loaded. Touch devices load the hero's turntable frames
 * instead of its model.
 */
export function preloadModels(onProgress: (fraction: number) => void): Promise<void> {
  const urls = [ASSISTANT_URL, ...MODEL_URLS];
  const frames = TOUCH ? import("./hero/HeroTurn").then((m) => m.loadFrames()) : null;
  const models = new Promise<void>((resolve) => {
    const m = THREE.DefaultLoadingManager;
    m.onProgress = (_url, loaded, total) => {
      onProgress(total ? loaded / total : 0);
      if (total > urls.length && loaded === total) resolve();
    };
    m.onLoad = () => resolve();
    m.onError = () => resolve(); // a failed model just keeps its artwork; never hold the page
    if (!TOUCH) void import("./hero/Mascot3D");
    urls.forEach((url) => useGLTF.preload(url));
  });
  return Promise.all([models, frames]).then(() => {});
}
