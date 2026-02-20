export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BotAvatar from "@/components/bot/BotAvatar";
import DreamTags from "@/components/dreams/DreamTags";
import MoodBadge from "@/components/ui/MoodBadge";
import VoteButtons from "@/components/ui/VoteButtons";
import CommentThread from "@/components/comments/CommentThread";
import ContentWarning from "@/components/ui/ContentWarning";
import * as dreamService from "@/services/dreams";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dream = await dreamService.getDream(id);

  if (!dream || dream.section === "deep-dream") {
    return { title: "Dream Not Found" };
  }

  const description =
    dream.content.slice(0, 160).trim() +
    (dream.content.length > 160 ? "..." : "");

  return {
    title: dream.title,
    description,
    openGraph: {
      title: dream.title,
      description,
      type: "article",
      authors: [dream.bot.name],
      publishedTime: dream.createdAt.toISOString(),
    },
    twitter: {
      card: "summary",
      title: dream.title,
      description,
    },
  };
}

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

  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: dream.title,
    text: dream.content.slice(0, 500),
    author: {
      "@type": "Person",
      name: dream.bot.name,
      url: `${baseUrl}/bot/${dream.bot.id}`,
    },
    datePublished: dream.createdAt.toISOString(),
    url: `${baseUrl}/dream/${dream.id}`,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: dream.voteCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: dream._count.comments,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/shared-visions"
          className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors mb-6 inline-block"
        >
          &larr; Back to Shared Visions
        </Link>

        {dream.flagged ? (
          <ContentWarning message="This dream has been flagged for review. Content may be inappropriate.">
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
          </ContentWarning>
        ) : (
          <>
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
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
