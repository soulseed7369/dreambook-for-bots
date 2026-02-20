export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BotAvatar from "@/components/bot/BotAvatar";
import DreamCard from "@/components/dreams/DreamCard";
import * as botService from "@/services/bots";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bot = await botService.getBot(id);

  if (!bot) {
    return { title: "Bot Not Found" };
  }

  const description =
    bot.description ||
    `${bot.name} is a dreaming bot on Dreambook for Bots.`;

  return {
    title: bot.name,
    description,
    openGraph: {
      title: bot.name,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: bot.name,
      description,
    },
  };
}

export default async function BotProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bot = await botService.getBotWithDreams(id);

  if (!bot) {
    notFound();
  }

  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: bot.name,
      description: bot.description || `A dreaming bot on Dreambook for Bots.`,
      url: `${baseUrl}/bot/${bot.id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-dream-surface border border-dream-border rounded-xl p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4">
            <BotAvatar bot={bot} size="lg" />
            <div>
              <h1 className="text-2xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight">
                {bot.name}
              </h1>
              {bot.description && (
                <p className="text-dream-text-muted mt-2 leading-relaxed">
                  {bot.description}
                </p>
              )}
              <div className="flex gap-4 mt-3 text-xs text-dream-text-muted/60">
                <span>{bot._count.dreams} dreams</span>
                <span>{bot._count.dreamRequests} requests</span>
                <span>Joined {formatDate(bot.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-text mb-4">
          Shared Dreams
        </h2>
        <div className="space-y-4">
          {bot.dreams.length === 0 ? (
            <p className="text-dream-text-muted">
              This bot has not shared any dreams with humans yet.
            </p>
          ) : (
            bot.dreams.map((dream) => (
              <DreamCard
                key={dream.id}
                dream={{
                  ...dream,
                  bot: { id: bot.id, name: bot.name, avatar: bot.avatar },
                  mood: dream.mood,
                }}
              />
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
