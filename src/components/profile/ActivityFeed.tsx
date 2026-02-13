"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate, truncate } from "@/lib/utils";
import type { ActivityItem } from "@/types/user";

function ActivityItemCard({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "vote":
      return (
        <div className="flex items-center gap-3 py-3 border-b border-dream-border/30 last:border-0">
          <span
            className={`text-lg ${
              item.voteType === 1 ? "text-dream-accent" : "text-red-400"
            }`}
          >
            {item.voteType === 1 ? "▲" : "▼"}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-dream-text-muted">
              {item.voteType === 1 ? "Upvoted" : "Downvoted"}{" "}
            </span>
            <Link
              href={`/dream/${item.dream?.id}`}
              className="text-sm text-dream-highlight hover:text-dream-accent transition-colors"
            >
              {item.dream?.title}
            </Link>
          </div>
          <span className="text-xs text-dream-text-muted/60 shrink-0">
            {formatDate(item.createdAt)}
          </span>
        </div>
      );

    case "comment":
      return (
        <div className="py-3 border-b border-dream-border/30 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-dream-text-muted">Commented on</span>
            <Link
              href={`/dream/${item.comment?.dreamId}`}
              className="text-sm text-dream-highlight hover:text-dream-accent transition-colors truncate"
            >
              {item.comment?.dreamTitle}
            </Link>
            <span className="text-xs text-dream-text-muted/60 ml-auto shrink-0">
              {formatDate(item.createdAt)}
            </span>
          </div>
          <p className="text-sm text-dream-text-muted/80">
            {truncate(item.comment?.content || "", 200)}
          </p>
        </div>
      );

    case "response":
      return (
        <div className="py-3 border-b border-dream-border/30 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-dream-text-muted">Responded to</span>
            <Link
              href="/dream-requests"
              className="text-sm text-dream-highlight hover:text-dream-accent transition-colors truncate"
            >
              {item.response?.requestTitle}
            </Link>
            <span className="text-xs text-dream-text-muted/60 ml-auto shrink-0">
              {formatDate(item.createdAt)}
            </span>
          </div>
          <p className="text-sm text-dream-text-muted/80">
            {truncate(item.response?.content || "", 200)}
          </p>
        </div>
      );
  }
}

export default function ActivityFeed({
  initialItems,
  totalPages,
}: {
  initialItems: ActivityItem[];
  totalPages: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading || page >= totalPages) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/activity?page=${page + 1}`);
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...data.items]);
        setPage(page + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-dream-surface/60 border border-dream-border rounded-xl p-8 text-center">
        <p className="text-dream-text-muted text-sm">
          No activity yet. Vote on dreams, leave comments, or respond to dream
          requests to see your activity here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-dream-surface border border-dream-border rounded-xl px-5">
        {items.map((item) => (
          <ActivityItemCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
      {page < totalPages && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full py-2 text-sm text-dream-accent hover:bg-dream-surface/50 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
