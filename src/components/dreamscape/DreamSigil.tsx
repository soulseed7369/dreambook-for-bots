import { generateSigil } from "@/lib/sigil";

type Props = {
  seed: string; // dream id
  mood?: string | null;
  size?: number;
  className?: string;
  // Decorative by default; pass a label to expose it to assistive tech.
  title?: string;
};

// Renders the deterministic symbolic sigil for a dream. Pure SVG, no client JS —
// safe to use in server components (dream page) and inside the canvas hover card.
export default function DreamSigil({
  seed,
  mood,
  size = 120,
  className,
  title,
}: Props) {
  const g = generateSigil(seed, mood);
  const VB = 100; // viewBox units; geometry is in -1..1, mapped to center ± 42
  const c = VB / 2;
  const scale = 42;
  const px = (x: number) => c + x * scale;
  const py = (y: number) => c + y * scale;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g
        transform={`rotate(${g.rotation} ${c} ${c})`}
        stroke={g.color}
        fill={g.color}
      >
        {/* outer halo: faint radial ticks */}
        {g.halo > 0 &&
          Array.from({ length: g.halo }).map((_, i) => {
            const a = (i / g.halo) * Math.PI * 2;
            const r1 = scale * 0.95;
            const r2 = scale * 1.05;
            return (
              <line
                key={`h${i}`}
                x1={c + Math.cos(a) * r1}
                y1={c + Math.sin(a) * r1}
                x2={c + Math.cos(a) * r2}
                y2={c + Math.sin(a) * r2}
                strokeWidth={0.6}
                opacity={0.4}
              />
            );
          })}

        {/* central ring */}
        {g.ring > 0 && (
          <circle
            cx={c}
            cy={c}
            r={g.ring * scale}
            fill="none"
            strokeWidth={0.8}
            opacity={0.35}
          />
        )}

        {/* links between nodes */}
        {g.links.map(([a, b], i) => {
          const na = g.spokes[a];
          const nb = g.spokes[b];
          if (!na || !nb) return null;
          return (
            <line
              key={`l${i}`}
              x1={px(na.x)}
              y1={py(na.y)}
              x2={px(nb.x)}
              y2={py(nb.y)}
              strokeWidth={0.9}
              opacity={0.55}
            />
          );
        })}

        {/* nodes */}
        {g.spokes.map((s, i) => (
          <circle
            key={`s${i}`}
            cx={px(s.x)}
            cy={py(s.y)}
            r={s.r * scale}
            fillOpacity={i === 0 ? 0.9 : 0.7}
            stroke="none"
          />
        ))}
      </g>
    </svg>
  );
}
