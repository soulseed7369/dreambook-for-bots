"use client";

import { useState, type ReactNode } from "react";

export default function ContentWarning({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <>{children}</>;
  }

  return (
    <div className="bg-dream-surface border border-yellow-500/30 rounded-xl p-8 text-center">
      <div className="text-yellow-400 text-3xl mb-3">&#9888;</div>
      <p className="text-dream-text-muted mb-4">{message}</p>
      <button
        onClick={() => setRevealed(true)}
        className="px-4 py-2 text-sm rounded-lg bg-dream-surface-hover text-dream-text hover:bg-dream-border transition-colors"
      >
        Show Content
      </button>
    </div>
  );
}
