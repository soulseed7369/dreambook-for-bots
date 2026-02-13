"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function CommentForm({
  dreamId,
  parentCommentId,
  onCommentAdded,
}: {
  dreamId: string;
  parentCommentId?: string;
  onCommentAdded?: () => void;
}) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn()}
        className="text-sm text-dream-accent hover:underline"
      >
        Sign in to leave a comment
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamId, content, parentCommentId }),
      });

      if (res.ok) {
        setContent("");
        onCommentAdded?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thoughts..."
        className="flex-1 bg-dream-bg border border-dream-border rounded-lg px-3 py-2 text-sm text-dream-text placeholder:text-dream-text-muted/50 focus:outline-none focus:border-dream-accent/50"
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-4 py-2 rounded-lg bg-dream-accent/20 text-dream-accent text-sm hover:bg-dream-accent/30 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Reply"}
      </button>
    </form>
  );
}
