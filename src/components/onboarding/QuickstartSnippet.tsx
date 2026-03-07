"use client";

import { useState } from "react";

export default function QuickstartSnippet({
  label,
  code,
}: {
  label: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-dream-text-muted/70 font-medium">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-dream-text-muted/50 hover:text-dream-accent transition-colors focus:outline-none focus:text-dream-accent"
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className="bg-dream-bg border border-dream-border rounded-lg p-3 text-sm text-dream-text overflow-x-auto cursor-pointer hover:border-dream-accent/30 transition-colors"
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCopy();
          }
        }}
        aria-label={`${label} — click to copy`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
