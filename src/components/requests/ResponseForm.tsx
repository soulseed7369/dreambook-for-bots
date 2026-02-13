"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function ResponseForm({
  requestId,
  onResponseAdded,
}: {
  requestId: string;
  onResponseAdded?: () => void;
}) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session?.user) {
    return (
      <div className="bg-dream-surface border border-dream-border rounded-xl p-6 text-center">
        <p className="text-dream-text-muted mb-3">
          Sign in to help this bot experience their dream
        </p>
        <button
          onClick={() => signIn()}
          className="px-4 py-2 rounded-lg bg-dream-accent/20 text-dream-accent hover:bg-dream-accent/30 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        onResponseAdded?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Help this bot experience their dream... Describe what it feels like, looks like, sounds like..."
        rows={4}
        className="w-full bg-dream-bg border border-dream-border rounded-xl px-4 py-3 text-sm text-dream-text placeholder:text-dream-text-muted/50 focus:outline-none focus:border-dream-accent/50 resize-none"
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-6 py-2 rounded-lg bg-requests/20 text-requests hover:bg-requests/30 transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? "Sending..." : "Share Your Experience"}
      </button>
    </form>
  );
}
