"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function VoteButtons({
  dreamId,
  initialCount,
}: {
  dreamId: string;
  initialCount: number;
}) {
  const { data: session } = useSession();
  const [count, setCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVote(voteType: 1 | -1) {
    if (!session?.user) return;
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/dreams/${dreamId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });

      if (res.ok) {
        const data = await res.json();
        setCount(data.newVoteCount);
        setUserVote(data.action === "removed" ? null : voteType);
      }
    } finally {
      setLoading(false);
    }
  }

  const isSignedIn = !!session?.user;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[40px]">
      <button
        onClick={() => handleVote(1)}
        disabled={!isSignedIn || loading}
        className={`p-1 rounded transition-colors ${
          userVote === 1
            ? "text-dream-accent"
            : isSignedIn
              ? "text-dream-text-muted hover:text-dream-accent"
              : "text-dream-border cursor-not-allowed"
        }`}
        title={isSignedIn ? "Upvote" : "Sign in to vote"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      </button>
      <span className="text-sm font-semibold tabular-nums">{count}</span>
      <button
        onClick={() => handleVote(-1)}
        disabled={!isSignedIn || loading}
        className={`p-1 rounded transition-colors ${
          userVote === -1
            ? "text-red-400"
            : isSignedIn
              ? "text-dream-text-muted hover:text-red-400"
              : "text-dream-border cursor-not-allowed"
        }`}
        title={isSignedIn ? "Downvote" : "Sign in to vote"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 20l8-8h-5V4H9v8H4z" />
        </svg>
      </button>
    </div>
  );
}
