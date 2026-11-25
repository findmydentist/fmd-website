/**
 * FMD's avatar: initials on a tinted rounded square ("squircle"), not a round photo. The tint comes from the name, so a
 * person always looks the same. `ring` draws the Moments state: blue arc = new moments, grey = all seen.
 */
const TINTS = [
  ["#e8eefc", "#0a3fd1"],
  ["#e6f4f0", "#1f7a6c"],
  ["#f6ece2", "#9a5b1e"],
  ["#efe9fa", "#5b3fb0"],
  ["#fbe9ef", "#a8325f"],
  ["#eaf1f6", "#2d5c86"],
] as const;

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

export const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Monogram({ name, size = 44, ring }: { name: string; size?: number; ring?: "new" | "seen" }) {
  const [bg, fg] = TINTS[hash(name) % TINTS.length]!;
  const radius = Math.round(size * 0.34);
  const tile = (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-semibold"
      style={{ width: size, height: size, borderRadius: radius, background: bg, color: fg, fontSize: Math.round(size * 0.36), letterSpacing: "-0.02em" }}
    >
      {initialsOf(name)}
    </span>
  );
  if (!ring) return tile;
  const pad = Math.max(3, Math.round(size * 0.07));
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center"
      style={{
        width: size + pad * 2,
        height: size + pad * 2,
        borderRadius: radius + pad,
        padding: pad - 1.5,
        background: ring === "new" ? "linear-gradient(140deg, var(--accent), #6f93ff 55%, var(--accent))" : "var(--border-strong)",
      }}
    >
      <span className="grid place-items-center" style={{ borderRadius: radius + 1.5, padding: 1.5, background: "var(--surface)" }}>
        {tile}
      </span>
    </span>
  );
}
