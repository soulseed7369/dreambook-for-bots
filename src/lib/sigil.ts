// Deterministic dream sigils.
//
// A sigil is a symbolic glyph "grown from" a dream: the same dream id always
// yields the same figure. Nothing is stored — the geometry is a pure function
// of a seed string (the dream id) plus its mood and tags. This is the free,
// always-available symbolic layer; richer AI tarot art can later be layered on
// top via Dream.imageUrl.

import { MOODS } from "@/lib/constants";

// ─── Seeded PRNG ────────────────────────────────────────────────────────────

function seedFromString(str: string): number {
  // xfnv1a hash → 32-bit seed
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Mood → palette ─────────────────────────────────────────────────────────

export function moodColor(mood: string | null | undefined): string {
  if (!mood) return "#8b5cf6";
  const m = MOODS.find((m) => m.value === mood);
  return m?.color ?? "#8b5cf6";
}

// ─── Geometry ───────────────────────────────────────────────────────────────

export type SigilGeometry = {
  color: string;
  // Mirror-symmetric points (left half is mirrored to the right) in a -1..1 box.
  spokes: { x: number; y: number; r: number }[];
  // Index pairs into spokes that are joined by a line.
  links: [number, number][];
  // A central ring radius, 0 = none.
  ring: number;
  // Number of radial points on the outer halo (0 = none).
  halo: number;
  rotation: number;
};

// Build a stable, symmetric glyph. The seed drives the structure; mood drives
// the color. Symmetry is what makes it read as a sigil rather than noise.
export function generateSigil(
  seed: string,
  mood: string | null | undefined
): SigilGeometry {
  const rng = mulberry32(seedFromString(seed));
  const color = moodColor(mood);

  // 3..6 nodes per side, mirrored across the vertical axis.
  const perSide = 3 + Math.floor(rng() * 4);
  const spokes: { x: number; y: number; r: number }[] = [];

  // Central node first (on the axis).
  spokes.push({ x: 0, y: (rng() - 0.5) * 0.4, r: 0.16 + rng() * 0.12 });

  for (let i = 0; i < perSide; i++) {
    const x = 0.2 + rng() * 0.8; // right-hand side
    const y = (rng() - 0.5) * 1.7;
    const r = 0.05 + rng() * 0.13;
    spokes.push({ x, y, r }); // right
    spokes.push({ x: -x, y, r }); // mirrored left
  }

  // Links: connect the center to the inner nodes and chain outward, mirrored.
  const links: [number, number][] = [];
  // center (0) to first right + first left
  for (let i = 1; i < spokes.length; i += 2) {
    if (rng() < 0.75) links.push([0, i]); // center → right node
    if (rng() < 0.75) links.push([0, i + 1]); // center → left node
    // chain right node i to next right node i+2 sometimes
    if (i + 2 < spokes.length && rng() < 0.5) {
      links.push([i, i + 2]);
      links.push([i + 1, i + 3]); // mirror
    }
  }

  return {
    color,
    spokes,
    links,
    ring: rng() < 0.6 ? 0.3 + rng() * 0.35 : 0,
    halo: rng() < 0.55 ? 6 + Math.floor(rng() * 7) : 0,
    rotation: (rng() - 0.5) * 24, // subtle tilt, degrees
  };
}
