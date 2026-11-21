"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/*
 * A mascot's picture with its animated loop over it (made from the picture itself by model/blender/mascots/animate_*.py):
 * the video loads only as it nears the screen, fades in once it plays (the still then hides, or it would show through
 * behind the moving one) and pauses once scrolled away. Safari (iPhone, iPad and Mac) can't show a WebM's
 * transparency, and reduced motion asks for stillness: both keep the picture. Fills its (positioned) parent.
 */
const NO_ALPHA_VIDEO = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1) ||
  (/Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(navigator.userAgent));

export function MascotLoop({ still, video, sizes, onPlaying }: { still: string; video: string; sizes: string; onPlaying?: (on: boolean) => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = v.current;
    if (!el || NO_ALPHA_VIDEO() || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return el.pause();
        if (!el.getAttribute("src")) el.src = video;
        el.play().catch(() => {});
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [video]);
  const show = (yes: boolean) => {
    setOn(yes);
    onPlaying?.(yes);
  };
  return (
    <>
      <Image src={still} alt="" fill sizes={sizes} className={`object-contain transition-opacity duration-500 ${on ? "opacity-0" : "opacity-100"}`} />
      <video
        ref={v}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden
        onPlaying={() => show(true)}
        onError={() => show(false)}
        className={`absolute inset-0 size-full object-contain transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
