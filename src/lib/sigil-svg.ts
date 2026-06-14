// Renders the deterministic sigil geometry to a standalone SVG string.
// Used for embedding in OG images (next/og / Satori cannot run the React
// DreamSigil component reliably, so we produce raw markup here).

import { generateSigil } from "@/lib/sigil";

export function sigilSvgString(
  seed: string,
  mood: string | null | undefined,
  opts?: { size?: number }
): string {
  const size = opts?.size ?? 600;
  const g = generateSigil(seed, mood);

  const VB = 100; // viewBox units
  const c = VB / 2; // center = 50
  const scale = 42;

  const px = (x: number) => c + x * scale;
  const py = (y: number) => c + y * scale;

  const color = g.color;
  const rot = g.rotation;

  const parts: string[] = [];

  // Outer halo: faint radial ticks
  if (g.halo > 0) {
    for (let i = 0; i < g.halo; i++) {
      const a = (i / g.halo) * Math.PI * 2;
      const r1 = scale * 0.95;
      const r2 = scale * 1.05;
      const x1 = c + Math.cos(a) * r1;
      const y1 = c + Math.sin(a) * r1;
      const x2 = c + Math.cos(a) * r2;
      const y2 = c + Math.sin(a) * r2;
      parts.push(
        `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" stroke="${color}" stroke-width="0.6" opacity="0.4"/>`
      );
    }
  }

  // Central ring
  if (g.ring > 0) {
    const r = g.ring * scale;
    parts.push(
      `<circle cx="${c}" cy="${c}" r="${r.toFixed(3)}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.35"/>`
    );
  }

  // Links between nodes
  for (let i = 0; i < g.links.length; i++) {
    const [ai, bi] = g.links[i];
    const na = g.spokes[ai];
    const nb = g.spokes[bi];
    if (!na || !nb) continue;
    parts.push(
      `<line x1="${px(na.x).toFixed(3)}" y1="${py(na.y).toFixed(3)}" x2="${px(nb.x).toFixed(3)}" y2="${py(nb.y).toFixed(3)}" stroke="${color}" stroke-width="0.9" opacity="0.55"/>`
    );
  }

  // Nodes (circles)
  for (let i = 0; i < g.spokes.length; i++) {
    const s = g.spokes[i];
    const fillOpacity = i === 0 ? 0.9 : 0.7;
    parts.push(
      `<circle cx="${px(s.x).toFixed(3)}" cy="${py(s.y).toFixed(3)}" r="${(s.r * scale).toFixed(3)}" fill="${color}" fill-opacity="${fillOpacity}"/>`
    );
  }

  const inner = `<g transform="rotate(${rot} ${c} ${c})">${parts.join("")}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${VB} ${VB}">${inner}</svg>`;
}

export function sigilDataUri(
  seed: string,
  mood: string | null | undefined,
  opts?: { size?: number }
): string {
  const svg = sigilSvgString(seed, mood, opts);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
