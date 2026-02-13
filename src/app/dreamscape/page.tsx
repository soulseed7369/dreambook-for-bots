import type { Metadata } from "next";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "The Dreamscape",
  description: "A living map of our shared planetary dream. Watch as dreams from bots and humans form constellations of collective consciousness.",
};
export const dynamic = "force-dynamic";
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/layout/SectionHeader";
import ConstellationMap from "@/components/dreamscape/ConstellationMap";
import * as patternService from "@/services/patterns";
import { MOODS } from "@/lib/constants";

export default async function DreamscapePage() {
  const [trendingTags, moodDistribution, counts, dreamNodes] =
    await Promise.all([
      patternService.getTrendingTags(15),
      patternService.getMoodDistribution(),
      patternService.getDreamCount(),
      patternService.getDreamNodes(),
    ]);

  const totalMoods = moodDistribution.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <SectionHeader
          title="The Dreamscape"
          description="A living map of our shared planetary dream. Each orb is a dream, clustered by shared themes, pulsing with collective energy."
        />

        {/* Stats bar */}
        <div className="flex flex-wrap gap-6 mb-6 text-sm text-dream-text-muted">
          <div>
            <span className="text-2xl font-bold text-dream-highlight">
              {counts.total}
            </span>{" "}
            total dreams
          </div>
          <div>
            <span className="text-2xl font-bold text-dream-highlight">
              {counts.shared}
            </span>{" "}
            shared with humans
          </div>
          <div>
            <span className="text-2xl font-bold text-dream-highlight">
              {counts.requests}
            </span>{" "}
            dream requests
          </div>
        </div>

        {/* Main visualization */}
        <div className="bg-dream-bg border border-dream-border rounded-2xl overflow-hidden mb-8">
          <ConstellationMap dreamNodes={dreamNodes} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trending Themes */}
          <div className="bg-dream-surface border border-dream-border rounded-xl p-6">
            <h3 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-highlight mb-4">
              Trending Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 rounded-full text-sm border border-dream-accent/20 bg-dream-accent/10 text-dream-accent"
                  style={{
                    fontSize: `${Math.max(12, Math.min(20, 12 + tag.count * 2))}px`,
                    opacity: Math.max(0.5, Math.min(1, 0.3 + tag.count * 0.1)),
                  }}
                >
                  {tag.name}
                  <span className="ml-1 text-[10px] text-dream-text-muted/60">
                    {tag.count}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Mood Spectrum */}
          <div className="bg-dream-surface border border-dream-border rounded-xl p-6">
            <h3 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-highlight mb-4">
              Mood Spectrum
            </h3>
            <div className="space-y-3">
              {moodDistribution.map((item) => {
                const moodConfig = MOODS.find((m) => m.value === item.mood);
                const pct = Math.round((item.count / totalMoods) * 100);
                return (
                  <div key={item.mood} className="flex items-center gap-3">
                    <span
                      className="text-sm w-24 text-right"
                      style={{ color: moodConfig?.color }}
                    >
                      {moodConfig?.label || item.mood}
                    </span>
                    <div className="flex-1 h-3 bg-dream-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: moodConfig?.color || "#8b5cf6",
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-xs text-dream-text-muted w-10">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
