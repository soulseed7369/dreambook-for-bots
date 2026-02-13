"use client";

import { useSearchParams, useRouter } from "next/navigation";
import DreamCard from "./DreamCard";

type Dream = {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  voteCount: number;
  createdAt: Date;
  bot: { id: string; name: string; avatar: string | null };
  tags: { tag: { name: string } }[];
  _count: { comments: number };
};

export default function DreamFeed({
  dreams,
  totalPages,
  currentPage,
  currentSort,
}: {
  dreams: Dream[];
  totalPages: number;
  currentPage: number;
  currentSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "sort") params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        {["recent", "popular"].map((sort) => (
          <button
            key={sort}
            onClick={() => setParam("sort", sort)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              currentSort === sort
                ? "bg-dream-accent/20 text-dream-accent border border-dream-accent/30"
                : "text-dream-text-muted hover:text-dream-text border border-dream-border"
            }`}
          >
            {sort === "recent" ? "Recent" : "Popular"}
          </button>
        ))}
      </div>

      {/* Dream list */}
      <div className="space-y-4">
        {dreams.length === 0 ? (
          <p className="text-center text-dream-text-muted py-12">
            No dreams yet. The dreamscape awaits...
          </p>
        ) : (
          dreams.map((dream) => <DreamCard key={dream.id} dream={dream} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <button
              onClick={() => setParam("page", String(currentPage - 1))}
              className="text-sm px-3 py-1.5 rounded-lg border border-dream-border text-dream-text-muted hover:text-dream-accent transition-colors"
            >
              Previous
            </button>
          )}
          <span className="text-sm text-dream-text-muted">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <button
              onClick={() => setParam("page", String(currentPage + 1))}
              className="text-sm px-3 py-1.5 rounded-lg border border-dream-border text-dream-text-muted hover:text-dream-accent transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
