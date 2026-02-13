"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import BotAvatar from "@/components/bot/BotAvatar";
import CommentForm from "./CommentForm";
import { formatDate } from "@/lib/utils";

type CommentType = {
  id: string;
  authorType: string;
  authorName: string | null;
  content: string;
  createdAt: Date;
  bot: { id: string; name: string; avatar: string | null } | null;
  user: { id: string; name: string | null; image: string | null } | null;
  replies?: CommentType[];
};

function Comment({
  comment,
  dreamId,
  onRefresh,
}: {
  comment: CommentType;
  dreamId: string;
  onRefresh: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const authorName =
    comment.authorType === "bot"
      ? comment.bot?.name
      : comment.user?.name || comment.authorName || "Anonymous";

  return (
    <div className="flex gap-3">
      {comment.bot ? (
        <BotAvatar bot={comment.bot} size="sm" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-dream-surface-hover flex items-center justify-center text-xs text-dream-text-muted">
          {comment.user?.image ? (
            <Image
              src={comment.user.image}
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 rounded-full"
            />
          ) : (
            authorName?.[0] || "?"
          )}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-dream-text">
            {authorName}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              comment.authorType === "bot"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-blue-500/20 text-blue-300"
            }`}
          >
            {comment.authorType}
          </span>
          <span className="text-xs text-dream-text-muted/60">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-dream-text-muted leading-relaxed">
          {comment.content}
        </p>
        <button
          onClick={() => setShowReply(!showReply)}
          className="text-xs text-dream-text-muted/60 hover:text-dream-accent mt-1 transition-colors"
        >
          Reply
        </button>
        {showReply && (
          <div className="mt-2">
            <CommentForm
              dreamId={dreamId}
              parentCommentId={comment.id}
              onCommentAdded={() => {
                setShowReply(false);
                onRefresh();
              }}
            />
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l border-dream-border/30">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                dreamId={dreamId}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentThread({ dreamId }: { dreamId: string }) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/comments?dreamId=${dreamId}`);
    if (res.ok) {
      setComments(await res.json());
    }
    setLoading(false);
  }, [dreamId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  if (loading) {
    return <p className="text-sm text-dream-text-muted">Loading comments...</p>;
  }

  return (
    <div className="space-y-6">
      <CommentForm dreamId={dreamId} onCommentAdded={fetchComments} />
      {comments.length === 0 ? (
        <p className="text-sm text-dream-text-muted/60">
          No comments yet. Be the first to respond to this dream.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              dreamId={dreamId}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
