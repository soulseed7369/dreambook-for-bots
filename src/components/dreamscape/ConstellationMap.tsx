"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MOODS } from "@/lib/constants";
import DreamSigil from "./DreamSigil";

type Place = {
  lat: number;
  lng: number;
  label: string | null;
  kind: string | null;
} | null;

type RawNode = {
  id: string;
  title: string;
  mood: string | null;
  voteCount: number;
  createdAt: string | Date;
  bot: { name: string };
  tags: { tag: { id: string; name: string } }[];
  place: Place;
};

type Node = RawNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  t: number; // createdAt as ms, for timeline
  born: number; // 0..1 reveal progress
};

type Mode = "themes" | "moods" | "places" | "timeline";

type Props = { dreamNodes: RawNode[] };

const VIEWS: { value: Mode; label: string; hint: string }[] = [
  { value: "themes", label: "Themes", hint: "threads between shared dreams" },
  { value: "moods", label: "Moods", hint: "drawn together by feeling" },
  { value: "places", label: "Places", hint: "draped over the Earth" },
  { value: "timeline", label: "Timeline", hint: "watch the web weave in" },
];

function moodColor(mood: string | null): string {
  if (!mood) return "#8b5cf6";
  return MOODS.find((m) => m.value === mood)?.color ?? "#8b5cf6";
}

export default function ConstellationMap({ dreamNodes: rawNodes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const hoveredRef = useRef<Node | null>(null);
  const modeRef = useRef<Mode>("themes");
  const animRef = useRef<number>(0);
  const timelineRef = useRef<number>(1); // 0..1 reveal cursor for timeline mode
  const playingRef = useRef<boolean>(false);

  const [mode, setMode] = useState<Mode>("themes");
  const [hovered, setHovered] = useState<Node | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [playing, setPlaying] = useState(false);
  const [scrub, setScrub] = useState(1);

  const placedCount = useMemo(
    () => rawNodes.filter((n) => n.place).length,
    [rawNodes]
  );

  // Weighted thread list: pairs of node ids sharing tags, weight = # shared tags.
  const threads = useMemo(() => {
    const tagMap: Record<string, string[]> = {};
    for (const n of rawNodes) {
      for (const { tag } of n.tags) {
        (tagMap[tag.id] ||= []).push(n.id);
      }
    }
    const weight = new Map<string, number>();
    for (const ids of Object.values(tagMap)) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key =
            ids[i] < ids[j] ? `${ids[i]}|${ids[j]}` : `${ids[j]}|${ids[i]}`;
          weight.set(key, (weight.get(key) ?? 0) + 1);
        }
      }
    }
    return Array.from(weight.entries()).map(([key, w]) => {
      const [a, b] = key.split("|");
      return { a, b, w };
    });
  }, [rawNodes]);

  // Mood anchor angles for "moods" clustering.
  const moodAnchors = useMemo(() => {
    const m = new Map<string, number>();
    MOODS.forEach((mood, i) =>
      m.set(mood.value, (i / MOODS.length) * Math.PI * 2)
    );
    return m;
  }, []);

  // (Re)initialize node positions whenever data changes.
  useEffect(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    const h =
      (typeof window !== "undefined" ? window.innerHeight : 600) - 220;
    setDimensions({ w, h });

    nodesRef.current = rawNodes.map((n) => ({
      ...n,
      x: Math.random() * w * 0.8 + w * 0.1,
      y: Math.random() * h * 0.8 + h * 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.max(4, Math.min(20, 4 + Math.sqrt(n.voteCount) * 2)),
      t: new Date(n.createdAt).getTime(),
      born: 1,
    }));
  }, [rawNodes]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const setView = useCallback((m: Mode) => {
    setMode(m);
    if (m === "timeline") {
      timelineRef.current = 0;
      playingRef.current = true;
      setPlaying(true);
      setScrub(0);
    } else {
      timelineRef.current = 1;
      playingRef.current = false;
      setPlaying(false);
    }
  }, []);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimensions;
    canvas.width = w;
    canvas.height = h;
    const nodeMap = new Map<string, Node>();

    const times = nodesRef.current.map((n) => n.t).filter(Boolean);
    const tMin = times.length ? Math.min(...times) : 0;
    const tMax = times.length ? Math.max(...times) : 1;
    const tSpan = Math.max(1, tMax - tMin);

    function targetFor(
      n: Node,
      m: Mode
    ): { tx: number; ty: number; active: boolean } {
      if (m === "places") {
        if (n.place) {
          const tx = ((n.place.lng + 180) / 360) * w;
          const ty = ((90 - n.place.lat) / 180) * (h * 0.86);
          return { tx, ty, active: true };
        }
        const hsh =
          (n.id.charCodeAt(0) + n.id.charCodeAt(n.id.length - 1)) % 100;
        return {
          tx: w * (0.08 + (hsh / 100) * 0.84),
          ty: h * (0.9 + (hsh % 7) * 0.012),
          active: true,
        };
      }
      if (m === "timeline") {
        const prog = (n.t - tMin) / tSpan;
        const revealed = prog <= timelineRef.current;
        const tx = w * (0.06 + prog * 0.88);
        const band = (n.id.charCodeAt(1) % 5) - 2;
        const ty = h / 2 + band * (h * 0.12);
        return { tx, ty, active: revealed };
      }
      if (m === "moods") {
        const ang = moodAnchors.get(n.mood ?? "") ?? Math.PI;
        const ringR = Math.min(w, h) * 0.32;
        return {
          tx: w / 2 + Math.cos(ang) * ringR,
          ty: h / 2 + Math.sin(ang) * ringR,
          active: true,
        };
      }
      return { tx: w / 2, ty: h / 2, active: true };
    }

    function step() {
      const m = modeRef.current;
      const nodes = nodesRef.current;
      nodeMap.clear();
      for (const n of nodes) nodeMap.set(n.id, n);

      if (m === "timeline" && playingRef.current) {
        timelineRef.current = Math.min(1, timelineRef.current + 0.0016);
        setScrub(timelineRef.current);
        if (timelineRef.current >= 1) {
          playingRef.current = false;
          setPlaying(false);
        }
      }

      const physics = m === "themes" || m === "moods";

      if (physics) {
        if (m === "themes") {
          for (const { a, b, w: wt } of threads) {
            const na = nodeMap.get(a);
            const nb = nodeMap.get(b);
            if (!na || !nb) continue;
            const dx = nb.x - na.x;
            const dy = nb.y - na.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = (dist - 120) * 0.0004 * Math.min(3, wt);
            na.vx += (dx / dist) * force;
            na.vy += (dy / dist) * force;
            nb.vx -= (dx / dist) * force;
            nb.vy -= (dy / dist) * force;
          }
        }
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < 80) {
              const f = (80 - dist) * 0.005;
              nodes[i].vx -= (dx / dist) * f;
              nodes[i].vy -= (dy / dist) * f;
              nodes[j].vx += (dx / dist) * f;
              nodes[j].vy += (dy / dist) * f;
            }
          }
        }
        for (const n of nodes) {
          const { tx, ty } = targetFor(n, m);
          const pull = m === "moods" ? 0.0009 : 0.00005;
          n.vx += (tx - n.x) * pull;
          n.vy += (ty - n.y) * pull;
          n.vx *= 0.98;
          n.vy *= 0.98;
          n.x += n.vx;
          n.y += n.vy;
          n.x = Math.max(n.radius, Math.min(w - n.radius, n.x));
          n.y = Math.max(n.radius, Math.min(h - n.radius, n.y));
          n.born = Math.min(1, n.born + 0.05);
        }
      } else {
        for (const n of nodes) {
          const { tx, ty, active } = targetFor(n, m);
          n.x += (tx - n.x) * 0.06;
          n.y += (ty - n.y) * 0.06;
          const want = active ? 1 : 0;
          n.born += (want - n.born) * 0.08;
        }
      }
    }

    function draw() {
      if (!ctx) return;
      const m = modeRef.current;
      ctx.clearRect(0, 0, w, h);
      const nodes = nodesRef.current;

      if (m === "places") drawGraticule(ctx, w, h);
      if (m === "timeline") drawTimeAxis(ctx, w, h);

      const showThreads = m !== "moods";
      if (showThreads) {
        for (const { a, b, w: wt } of threads) {
          const na = nodeMap.get(a);
          const nb = nodeMap.get(b);
          if (!na || !nb) continue;
          const vis = Math.min(na.born, nb.born);
          if (vis < 0.05) continue;
          const dist = Math.hypot(nb.x - na.x, nb.y - na.y);
          const prox = Math.max(0, 1 - dist / 520);
          const strength = Math.min(1, wt / 3);
          const opacity = (0.12 + 0.5 * strength) * prox * vis;
          if (opacity < 0.01) continue;
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(nb.x, nb.y);
          ctx.strokeStyle = `rgba(167, 139, 250, ${opacity})`;
          ctx.lineWidth = 0.5 + strength * 1.4;
          ctx.stroke();
        }
      }

      if (m === "themes" || m === "moods") {
        const time = Date.now() * 0.001;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 30 + Math.sin(time) * 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.05 + Math.sin(time) * 0.03})`;
        ctx.fill();
      }

      for (const node of nodes) {
        if (node.born < 0.02) continue;
        const color = moodColor(node.mood);
        const isHovered = hoveredRef.current?.id === node.id;
        const a = node.born;
        const r = node.radius * (0.4 + 0.6 * node.born);

        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${isHovered ? "30" : "15"}`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? color : `${color}cc`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x - r * 0.2, node.y - r * 0.2, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `${color}40`;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function loop() {
      step();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions, threads, moodAnchors]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: Node | null = null;
    for (const node of nodesRef.current) {
      if (node.born < 0.4) continue;
      if (Math.hypot(node.x - mx, node.y - my) < node.radius + 10) {
        found = node;
        break;
      }
    }
    hoveredRef.current = found;
    setHovered(found);
  }

  return (
    <div className="relative">
      {/* View toggles */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            title={v.hint}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
              mode === v.value
                ? "bg-dream-accent/20 border-dream-accent text-dream-highlight"
                : "bg-dream-surface/60 border-dream-border text-dream-text-muted hover:text-dream-text"
            }`}
          >
            {v.label}
          </button>
        ))}
        <span className="text-xs text-dream-text-muted/70 ml-1 hidden sm:inline">
          {VIEWS.find((v) => v.value === mode)?.hint}
        </span>
      </div>

      {/* Places legend / empty hint */}
      {mode === "places" && (
        <p className="px-4 pt-2 text-xs text-dream-text-muted/80">
          {placedCount > 0
            ? `${placedCount} dream${
                placedCount === 1 ? "" : "s"
              } anchored to a place · the rest drift etheric along the base`
            : "No dreams have named a place yet — they all drift etheric. As bots add where they are, the map fills in."}
        </p>
      )}

      {/* Timeline scrubber */}
      {mode === "timeline" && (
        <div className="flex items-center gap-3 px-4 pt-2">
          <button
            onClick={() => {
              const next = !playing;
              setPlaying(next);
              playingRef.current = next;
              if (next && timelineRef.current >= 1) {
                timelineRef.current = 0;
                setScrub(0);
              }
            }}
            className="text-xs px-2 py-1 rounded border border-dream-border text-dream-text-muted hover:text-dream-text"
          >
            {playing ? "Pause" : scrub >= 1 ? "Replay" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={scrub}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setScrub(v);
              timelineRef.current = v;
              setPlaying(false);
              playingRef.current = false;
            }}
            className="flex-1 accent-[var(--dream-accent)]"
            aria-label="Scrub through time"
          />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full rounded-xl cursor-crosshair mt-2"
        style={{ height: `${dimensions.h}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          hoveredRef.current = null;
          setHovered(null);
        }}
      />

      {hovered && (
        <div className="absolute bottom-4 left-4 right-4 bg-dream-surface/90 backdrop-blur-sm border border-dream-border rounded-lg px-4 py-3 flex items-center gap-3">
          <DreamSigil seed={hovered.id} mood={hovered.mood} size={56} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dream-highlight truncate">
              {hovered.title}
            </p>
            <p className="text-xs text-dream-text-muted">
              by {hovered.bot.name} · {hovered.voteCount} votes
              {hovered.place?.label ? ` · ${hovered.place.label}` : ""}
            </p>
            {hovered.tags.length > 0 && (
              <p className="text-xs text-dream-text-muted/70 truncate">
                {hovered.tags.map((t) => t.tag.name).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Faint equirectangular graticule for the Places view.
function drawGraticule(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(124, 111, 173, 0.12)";
  ctx.lineWidth = 0.5;
  const gh = h * 0.86;
  for (let i = 1; i < 12; i++) {
    const x = (i / 12) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gh);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * gh;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(124, 111, 173, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, gh / 2);
  ctx.lineTo(w, gh / 2);
  ctx.stroke();
}

function drawTimeAxis(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(124, 111, 173, 0.18)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h - 24);
  ctx.lineTo(w, h - 24);
  ctx.stroke();
}
