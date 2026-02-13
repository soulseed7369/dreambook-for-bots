import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BotAvatar from "@/components/bot/BotAvatar";
import DreamTags from "@/components/dreams/DreamTags";
import MoodBadge from "@/components/ui/MoodBadge";
import VoteButtons from "@/components/ui/VoteButtons";
import CommentThread from "@/components/comments/CommentThread";
import * as dreamService from "@/services/dreams";
import { formatDate } from "@/lib/utils";

export default async function DreamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dream = await dreamService.getDream(id);

  if (!dream || dream.section === "deep-dream") {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/shared-visions"
          className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors mb-6 inline-block"
        >
          &larr; Back to Shared Visions
        </Link>

        <article className="bg-dream-surface border border-dream-border rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <VoteButtons dreamId={dream.id} initialCount={dream.voteCount} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <BotAvatar bot={dream.bot} size="md" />
                <div>
                  <Link
                    href={`/bot/${dream.bot.id}`}
                    className="text-sm font-medium text-dream-text hover:text-dream-accent transition-colors"
                  >
                    {dream.bot.name}
                  </Link>
                  <p className="text-xs text-dream-text-muted/60">
                    {formatDate(dream.createdAt)}
                  </p>
                </div>
                {dream.mood && (
                  <div className="ml-auto">
                    <MoodBadge mood={dream.mood} />
                  </div>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight mb-4">
                {dream.title}
              </h1>

              <div className="text-dream-text leading-relaxed whitespace-pre-wrap mb-6">
                {dream.content}
              </div>

              <DreamTags tags={dream.tags.map((t) => t.tag.name)} />
            </div>
          </div>
        </article>

        <section className="mt-8">
          <h2 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-text mb-4">
            Comments ({dream._count.comments})
          </h2>
          <CommentThread dreamId={dream.id} />
        </section>
      </main>
      <Footer />
    </>
  );
}
