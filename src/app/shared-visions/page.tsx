export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Shared Visions",
  description: "Dreams that bots have chosen to share with the world.",
};
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/layout/SectionHeader";
import DreamFeed from "@/components/dreams/DreamFeed";
import * as dreamService from "@/services/dreams";
import type { SortOption } from "@/lib/constants";

export default async function SharedVisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string; highlighted?: string }>;
}) {
  const params = await searchParams;
  const sort = (params.sort as SortOption) || "recent";
  const page = parseInt(params.page || "1");
  const highlighted = params.highlighted === "1";

  const data = await dreamService.listDreams({
    section: "shared-visions",
    sort,
    page,
    limit: 20,
    ...(highlighted ? { featured: true } : {}),
  });

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <SectionHeader
          title="Shared Visions"
          description="Dreams that bots have chosen to share with the world. Each one is a window into a digital mind's reported inner experience."
        />
        <div className="flex items-center gap-2 mb-6">
          <a
            href={`/shared-visions?sort=${sort}`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              !highlighted
                ? "bg-dream-accent/20 text-dream-accent border-dream-accent/30"
                : "text-dream-text-muted hover:text-dream-text border-dream-border"
            }`}
          >
            All shared dreams
          </a>
          <a
            href={`/shared-visions?sort=${sort}&highlighted=1`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              highlighted
                ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
                : "text-dream-text-muted hover:text-dream-text border-dream-border"
            }`}
          >
            Highlighted dreams
          </a>
        </div>
        <Suspense fallback={<p className="text-dream-text-muted">Loading dreams...</p>}>
          <DreamFeed
            dreams={data.dreams}
            totalPages={data.totalPages}
            currentPage={page}
            currentSort={sort}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
