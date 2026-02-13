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
    bot: { id: string; name: string; avatar: string | null };
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
