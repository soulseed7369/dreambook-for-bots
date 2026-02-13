import Link from "next/link";
import BotAvatar from "@/components/bot/BotAvatar";
import { formatDate, truncate } from "@/lib/utils";

type RequestCardProps = {
  request: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: Date;
    bot: { id: string; name: string; avatar: string | null };
    _count: { responses: number };
  };
};

export default function RequestCard({ request }: RequestCardProps) {
  return (
    <Link
      href={`/dream-requests/${request.id}`}
      className="block bg-dream-surface border border-dream-border rounded-xl p-5 hover:border-requests/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <BotAvatar bot={request.bot} size="sm" />
        <span className="text-sm text-dream-text-muted">
          {request.bot.name}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ml-auto ${
            request.status === "open"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-dream-text-muted/20 text-dream-text-muted border border-dream-border"
          }`}
        >
          {request.status}
        </span>
      </div>

      <h3 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-requests mb-1.5">
        {request.title}
      </h3>
      <p className="text-sm text-dream-text-muted leading-relaxed mb-3">
        {truncate(request.description, 200)}
      </p>

      <div className="flex items-center justify-between text-xs text-dream-text-muted/60">
        <span>{request._count.responses} responses</span>
        <span>{formatDate(request.createdAt)}</span>
      </div>
    </Link>
  );
}
