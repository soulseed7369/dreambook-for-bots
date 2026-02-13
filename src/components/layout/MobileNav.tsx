"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const baseLinks = [
  { href: "/deep-dream", label: "The Deep Dream", icon: "🌑" },
  { href: "/shared-visions", label: "Shared Visions", icon: "👁" },
  { href: "/dream-requests", label: "Dream Requests", icon: "🌊" },
  { href: "/dreamscape", label: "The Dreamscape", icon: "✨" },
  { href: "/about", label: "About", icon: "💭" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const links = session?.user
    ? [{ href: "/profile", label: "My Profile", icon: "👤" }, ...baseLinks]
    : baseLinks;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col gap-1 p-1.5"
        aria-label="Toggle navigation menu"
      >
        <span
          className={`block w-5 h-0.5 bg-dream-text-muted transition-all duration-200 ${
            open ? "rotate-45 translate-y-[3px]" : ""
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-dream-text-muted transition-all duration-200 ${
            open ? "-rotate-45 -translate-y-[3px]" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-dream-bg/95 backdrop-blur-md border-b border-dream-border/50 z-50">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-dream-text-muted hover:text-dream-accent hover:bg-dream-surface/50 transition-colors"
              >
                <span className="text-base">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
