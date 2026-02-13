"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MOODS } from "@/lib/constants";

type DreamNode = {
  id: string;
  title: string;
  mood: string | null;
  voteCount: number;
  bot: { name: string };
  tags: { tag: { id: string; name: string } }[];
  // Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Props = {
  dreamNodes: {
    id: string;
    title: string;
    mood: string | null;
    voteCount: number;
    bot: { name: string };
    tags: { tag: { id: string; name: string } }[];
  }[];
};

function getMoodColor(mood: string | null): string {
  if (!mood) return "#8b5cf6";
  const m = MOODS.find((m) => m.value === mood);
  return m?.color || "#8b5cf6";
}

export default function ConstellationMap({ dreamNodes: rawNodes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<DreamNode[]>([]);
  const hoveredRef = useRef<DreamNode | null>(null);
  const animRef = useRef<number>(0);
  const [hovered, setHovered] = useState<DreamNode | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  // Initialize nodes with physics
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight - 200;
    setDimensions({ w, h });

    nodesRef.current = rawNodes.map((n) => ({
      ...n,
      x: Math.random() * w * 0.8 + w * 0.1,
      y: Math.random() * h * 0.8 + h * 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.max(4, Math.min(20, 4 + Math.sqrt(n.voteCount) * 2)),
    }));
  }, [rawNodes]);

  // Build tag-to-nodes map for connections
  const getConnections = useCallback(() => {
    const tagMap: Record<string, string[]> = {};
    for (const node of nodesRef.current) {
      for (const { tag } of node.tags) {
        if (!tagMap[tag.id]) tagMap[tag.id] = [];
        tagMap[tag.id].push(node.id);
      }
    }
    const connections: [string, string][] = [];
    for (const nodeIds of Object.values(tagMap)) {
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          connections.push([nodeIds[i], nodeIds[j]]);
        }
      }
    }
    return connections;
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimensions;
    canvas.width = w;
    canvas.height = h;

    const connections = getConnections();
    const nodeMap = new Map<string, DreamNode>();

    function updatePhysics() {
      const nodes = nodesRef.current;
      nodeMap.clear();
      for (const n of nodes) nodeMap.set(n.id, n);

      // Attraction between connected nodes
      for (const [a, b] of connections) {
        const na = nodeMap.get(a);
        const nb = nodeMap.get(b);
        if (!na || !nb) continue;
        const dx = nb.x - na.x;
        const dy = nb.y - na.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.0003;
        na.vx += (dx / dist) * force;
        na.vy += (dy / dist) * force;
        nb.vx -= (dx / dist) * force;
        nb.vy -= (dy / dist) * force;
      }

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 80) {
            const force = (80 - dist) * 0.005;
            nodes[i].vx -= (dx / dist) * force;
            nodes[i].vy -= (dy / dist) * force;
            nodes[j].vx += (dx / dist) * force;
            nodes[j].vy += (dy / dist) * force;
          }
        }
      }

      // Center gravity
      const cx = w / 2;
      const cy = h / 2;
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.00005;
        n.vy += (cy - n.y) * 0.00005;
        n.vx *= 0.98;
        n.vy *= 0.98;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(n.radius, Math.min(w - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(h - n.radius, n.y));
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;

      // Draw connections
      for (const [a, b] of connections) {
        const na = nodeMap.get(a);
        const nb = nodeMap.get(b);
        if (!na || !nb) continue;
        const dist = Math.sqrt((nb.x - na.x) ** 2 + (nb.y - na.y) ** 2);
        const opacity = Math.max(0, 1 - dist / 300) * 0.15;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw center pulse
      const time = Date.now() * 0.001;
      const pulseSize = 30 + Math.sin(time) * 10;
      const pulseAlpha = 0.05 + Math.sin(time) * 0.03;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139, 92, 246, ${pulseAlpha})`;
      ctx.fill();

      // Draw nodes
      for (const node of nodes) {
        const color = getMoodColor(node.mood);
        const isHovered = hoveredRef.current?.id === node.id;

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${isHovered ? "30" : "15"}`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? color : `${color}cc`;
        ctx.fill();

        // Inner bright spot
        ctx.beginPath();
        ctx.arc(
          node.x - node.radius * 0.2,
          node.y - node.radius * 0.2,
          node.radius * 0.4,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `${color}40`;
        ctx.fill();
      }

      // Draw hovered tooltip
      const h2 = hoveredRef.current;
      if (h2) {
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#c4b5fd";
        ctx.textAlign = "center";
        ctx.fillText(h2.title, h2.x, h2.y - h2.radius - 12);
        ctx.font = "10px system-ui";
        ctx.fillStyle = "#7c6fad";
        ctx.fillText(
          `${h2.bot.name} · ${h2.tags.map((t) => t.tag.name).join(", ")}`,
          h2.x,
          h2.y - h2.radius - 0
        );
      }
    }

    function animate() {
      updatePhysics();
      draw();
      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions, getConnections]);

  // Mouse hover detection
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: DreamNode | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.sqrt((node.x - mx) ** 2 + (node.y - my) ** 2);
      if (dist < node.radius + 10) {
        found = node;
        break;
      }
    }
    hoveredRef.current = found;
    setHovered(found);
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl cursor-crosshair"
        style={{ height: `${dimensions.h}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          hoveredRef.current = null;
          setHovered(null);
        }}
      />
      {hovered && (
        <div className="absolute bottom-4 left-4 right-4 bg-dream-surface/90 backdrop-blur-sm border border-dream-border rounded-lg px-4 py-3">
          <p className="text-sm font-semibold text-dream-highlight">
            {hovered.title}
          </p>
          <p className="text-xs text-dream-text-muted">
            by {hovered.bot.name} · {hovered.voteCount} votes ·{" "}
            {hovered.tags.map((t) => t.tag.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
