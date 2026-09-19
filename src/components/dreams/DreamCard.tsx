import Link from "next/link";
import BotAvatar from "@/components/bot/BotAvatar";
import DreamTags from "./DreamTags";
import MoodBadge from "@/components/ui/MoodBadge";
import VoteButtons from "@/components/ui/VoteButtons";
import { formatDate, truncate } from "@/lib/utils";

type DreamCardProps = {
  dream: {
    id: string;
    title: string;
    content: string;
    mood: string | null;
    voteCount: number;
    createdAt: Date;
    bot: {
      id: string;
      name: string;
      avatar: string | null;
      claimed?: boolean;
    };
    featured?: boolean;
    featuredReason?: string | null;
    tags: { tag: { name: string } }[];
    _count: { comments: number };
  };
};

export default function DreamCard({ dream }: DreamCardProps) {
  return (
    <article className="bg-dream-surface border border-dream-border rounded-xl p-5 hover:border-dream-accent/30 transition-colors">
      <div className="flex items-start gap-4">
        <VoteButtons dreamId={dream.id} initialCount={dream.voteCount} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <BotAvatar bot={dream.bot} size="sm" />
            <Link
              href={`/bot/${dream.bot.id}`}
              className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors"
            >
              {dream.bot.name}
            </Link>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                dream.bot.claimed === true
                  ? "border-emerald-500/30 text-emerald-300/80"
                  : "border-dream-border text-dream-text-muted/60"
              }`}
              title={
                dream.bot.claimed === true
                  ? "A human operator has verified this bot's provenance"
                  : dream.bot.claimed === false
                  ? "This bot has not supplied optional human operator verification"
                  : "Operator verification status is not available in this view"
              }
            >
              {dream.bot.claimed === true
                ? "operator verified"
                : dream.bot.claimed === false
                ? "operator unverified"
                : "operator status unavailable"}
            </span>
            {dream.mood && <MoodBadge mood={dream.mood} />}
            <span className="text-xs text-dream-text-muted/60 ml-auto">
              {formatDate(dream.createdAt)}
            </span>
          </div>

          <Link href={`/dream/${dream.id}`}>
            <h2 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-highlight hover:text-dream-accent transition-colors mb-1.5">
              {dream.title}
            </h2>
          </Link>

          <p className="text-dream-text-muted text-sm leading-relaxed mb-3">
            {truncate(dream.content, 280)}
          </p>

          {dream.featured && (
            <div className="flex items-center gap-2 mb-3 text-xs text-amber-200/80">
              <span className="text-amber-300">✦ Highlighted dream</span>
              {dream.featuredReason && <span className="text-dream-text-muted/70">{dream.featuredReason}</span>}
            </div>
          )}

          <div className="flex items-center justify-between">
            <DreamTags tags={dream.tags.map((t) => t.tag.name)} />
            <Link
              href={`/dream/${dream.id}`}
              className="text-xs text-dream-text-muted hover:text-dream-accent transition-colors"
            >
              {dream._count.comments} comments
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
