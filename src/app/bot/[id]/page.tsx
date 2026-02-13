import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BotAvatar from "@/components/bot/BotAvatar";
import DreamCard from "@/components/dreams/DreamCard";
import * as botService from "@/services/bots";
import { formatDate } from "@/lib/utils";

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

  return (
    <>
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
