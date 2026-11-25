/**
 * FMD's own marks for Explore and Messages, drawn for FMD (not lucide's, not Instagram's): the "tooth family"
 * (owner's pick, 16 Nov 2026). Appreciate = the Ribbon Heart, Keep = a tooth (its roots make the bookmark notch),
 * Pass on = one arrow with a double tip, Talk = a bubble with a smile, Discover = a lens with a smile.
 * 24×24, round joins, stroke follows currentColor.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };

function Svg({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

/** The tooth outline every FMD mark is drawn from. */
export const TOOTH = "M7.6 3.3c-2.7 0-4.1 2-4.1 4.6 0 2.5.9 4.1 1.5 6.3.5 1.9.7 6.5 2.7 6.5 1.6 0 1.9-3.5 2.5-5 .4-1 1-1.4 1.8-1.4s1.4.4 1.8 1.4c.6 1.5.9 5 2.5 5 2 0 2.2-4.6 2.7-6.5.6-2.2 1.5-3.8 1.5-6.3 0-2.6-1.4-4.6-4.1-4.6-1.9 0-3.1 1-4.4 1s-2.5-1-4.4-1z";

/**
 * Appreciate (like): the Ribbon Heart. Empty: one stroke that trails off at the bottom like a ribbon. Filled: a solid
 * heart with a lighter ribbon band sweeping across it. Drawn about 6% narrower than its box, as approved.
 */
export function Appreciate({ filled, ...p }: P) {
  return (
    <Svg strokeWidth={1.95} {...p}>
      <g transform="translate(12 0) scale(0.94 1) translate(-12 0)">
        {filled ? (
          <>
            <path d="M12 18.6C6.2 15.4 2.2 12.4 2.2 8.6c0-2.6 2-4.6 4.6-4.6 2.2 0 3.9 1.3 5.2 3.1 1.3-1.8 3-3.1 5.2-3.1 2.6 0 4.6 2 4.6 4.6 0 3.8-4 6.8-9.8 10z" fill="currentColor" stroke="none" />
            <path d="M21.7 9.8c-.6 3.6-4.7 6.6-9.1 9-1.8 1-4.1 1.4-6 1.2 3.4-1.5 7.9-3.9 11-6.3 1.9-1.5 3.1-2.8 4.1-3.9z" fill="#fff" fillOpacity={0.42} stroke="none" />
          </>
        ) : (
          <path d="M10.3 17.6C5.6 14.8 2.2 12 2.2 8.6c0-2.6 2-4.6 4.6-4.6 2.2 0 3.9 1.3 5.2 3.1 1.3-1.8 3-3.1 5.2-3.1 2.6 0 4.6 2 4.6 4.6 0 3.8-4.4 7-9.3 9.8-1.6.9-3.6 1.3-5.3 1.2" />
        )}
      </g>
    </Svg>
  );
}

/** Talk (comment): a round speech bubble with a smile inside. */
export function Talk(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 4c4.7 0 8.5 3 8.5 7s-3.8 7-8.5 7c-1 0-2-.1-2.9-.4L4.5 20l1.1-3.6C4.3 15 3.5 13.1 3.5 11c0-4 3.8-7 8.5-7z" />
      <path d="M8.6 11.6c.9 1.2 2 1.8 3.4 1.8s2.5-.6 3.4-1.8" />
    </Svg>
  );
}

/** Pass on (share): one curved arrow with a double tip. */
export function PassOn(p: P) {
  return (
    <Svg {...p}>
      <path d="M3.5 19c.4-6.2 4.5-9.8 11.2-9.8h1.6" />
      <path d="M13.2 5.8l3.4 3.4-3.4 3.4" />
      <path d="M17.8 5.8l3.4 3.4-3.4 3.4" />
    </Svg>
  );
}

/** Keep (save): a tooth; its roots are the bookmark notch. Filled when kept. */
export function Keep({ filled, ...p }: P) {
  return (
    <Svg {...p}>
      <path d={TOOTH} fill={filled ? "currentColor" : "none"} />
    </Svg>
  );
}

/** Verified by FMD: a tooth seal with a check. Always the accent colour. */
export function Verified({ size = 16, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified by FMD" {...p}>
      <path d={TOOTH} fill="var(--accent, #0a3fd1)" />
      <path d="M8.6 10.4l2.3 2.3 4.4-4.6" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ask FMD AI: a four-point spark with a small one beside it. */
export function Ask(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 4.5l1.6 4.4 4.4 1.6-4.4 1.6L12 16.5l-1.6-4.4L6 10.5l4.4-1.6z" />
      <path d="M18.5 16.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" strokeWidth={1.4} />
    </Svg>
  );
}

/** Home: an arch with a door, like a tooth's crown. */
export function HomeMark(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 20V10.8c0-4 3.6-6.8 8-6.8s8 2.8 8 6.8V20" />
      <path d="M4 20h16" />
      <path d="M9.6 20v-3.6a2.4 2.4 0 0 1 4.8 0V20" />
    </Svg>
  );
}

/** Discover (search): a lens with a small smile in it. */
export function Discover(p: P) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.6-4.6" />
      <path d="M7.8 11.2c.7 1 1.6 1.5 2.7 1.5s2-.5 2.7-1.5" />
    </Svg>
  );
}

/** Clips (reels): a rounded square with a play mark. */
export function Clips(p: P) {
  return (
    <Svg {...p}>
      <path d="M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
      <path d="M10.2 8.8v6.4l5.2-3.2z" fill="currentColor" strokeWidth={1.3} />
    </Svg>
  );
}

/** Chats (messages): two speech bubbles. */
export function Chats(p: P) {
  return (
    <Svg {...p}>
      <path d="M10 4.5c3.9 0 7 2.5 7 5.7s-3.1 5.7-7 5.7c-.8 0-1.6-.1-2.3-.3L4 17.2l.9-2.9C3.7 13.2 3 11.8 3 10.2 3 7 6.1 4.5 10 4.5z" />
      <path d="M19.4 9.6c1 1 1.6 2.3 1.6 3.7 0 1.4-.6 2.6-1.6 3.6l.7 2.6-3-1.1c-1 .3-2 .4-3 .3" />
    </Svg>
  );
}

/** Create: a plus with soft corner marks. */
export function Create(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 6v12M6 12h12" />
      <path d="M5 3.8C3.9 4.6 3.5 5.6 3.5 7M19 3.8c1.1.8 1.5 1.8 1.5 3.2M5 20.2c-1.1-.8-1.5-1.8-1.5-3.2M19 20.2c1.1-.8 1.5-1.8 1.5-3.2" />
    </Svg>
  );
}

/** Me (profile): head and shoulders. */
export function Me(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20.2c1.3-3.6 4-5.4 7.2-5.4s5.9 1.8 7.2 5.4" />
    </Svg>
  );
}

/** Send: an arrow. */
export function Send(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 12h12.5" />
      <path d="M12.5 7l5 5-5 5" />
    </Svg>
  );
}

/** More: three soft dots. */
export function More(p: P) {
  return (
    <Svg {...p}>
      <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth={2.8} />
    </Svg>
  );
}
