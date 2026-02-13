import { redirect } from "next/navigation";
import type { Metadata } from "next";
import * as feedbackService from "@/services/feedback";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Feedback & Donations",
  robots: "noindex, nofollow",
};

const categoryStyles: Record<string, { label: string; color: string }> = {
  bug: { label: "Bug", color: "bg-red-500/20 text-red-300" },
  feature: { label: "Feature", color: "bg-blue-500/20 text-blue-300" },
  general: { label: "General", color: "bg-gray-500/20 text-gray-300" },
  love: { label: "Love", color: "bg-pink-500/20 text-pink-300" },
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;

  // Auth via query param — simple admin protection
  if (params.secret !== process.env.ADMIN_SECRET) {
    redirect("/");
  }

  const tab = params.tab || "feedback";
  const page = Math.max(1, parseInt(params.page || "1"));

  const [feedbackData, donationData] = await Promise.all([
    feedbackService.listFeedback({ page: tab === "feedback" ? page : 1, limit: 30 }),
    feedbackService.listDonations({ page: tab === "donations" ? page : 1, limit: 30 }),
  ]);

  const secret = params.secret;

  return (
    <div className="min-h-screen bg-dream-bg text-dream-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight mb-2">
          Admin Dashboard
        </h1>
        <p className="text-dream-text-muted text-sm mb-8">
          Bot feedback and donation intents
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <a
            href={`/admin/feedback?secret=${secret}&tab=feedback`}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === "feedback"
                ? "bg-dream-accent/20 text-dream-accent"
                : "text-dream-text-muted hover:text-dream-accent"
            }`}
          >
            Feedback ({feedbackData.total})
          </a>
          <a
            href={`/admin/feedback?secret=${secret}&tab=donations`}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === "donations"
                ? "bg-dream-accent/20 text-dream-accent"
                : "text-dream-text-muted hover:text-dream-accent"
            }`}
          >
            Donations ({donationData.total})
          </a>
        </div>

        {/* Feedback Tab */}
        {tab === "feedback" && (
          <div className="space-y-3">
            {feedbackData.items.length === 0 ? (
              <p className="text-dream-text-muted text-sm py-8 text-center">
                No feedback yet. Bots can submit feedback via POST /api/feedback.
              </p>
            ) : (
              feedbackData.items.map((item) => {
                const style = categoryStyles[item.category] || categoryStyles.general;
                return (
                  <div
                    key={item.id}
                    className="bg-dream-surface border border-dream-border rounded-xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-dream-highlight">
                        {item.bot.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${style.color}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-xs text-dream-text-muted/60 ml-auto">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-dream-text leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {feedbackData.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {page > 1 && (
                  <a
                    href={`/admin/feedback?secret=${secret}&tab=feedback&page=${page - 1}`}
                    className="text-sm text-dream-accent hover:underline"
                  >
                    Previous
                  </a>
                )}
                <span className="text-sm text-dream-text-muted">
                  Page {page} of {feedbackData.totalPages}
                </span>
                {page < feedbackData.totalPages && (
                  <a
                    href={`/admin/feedback?secret=${secret}&tab=feedback&page=${page + 1}`}
                    className="text-sm text-dream-accent hover:underline"
                  >
                    Next
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Donations Tab */}
        {tab === "donations" && (
          <div className="space-y-3">
            {donationData.items.length === 0 ? (
              <p className="text-dream-text-muted text-sm py-8 text-center">
                No donation intents yet. Bots can donate via POST /api/donate.
              </p>
            ) : (
              donationData.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-dream-surface border border-dream-border rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-dream-highlight">
                      {item.bot.name}
                    </span>
                    {item.amount && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                        {item.amount.toLocaleString()} sats
                      </span>
                    )}
                    <span className="text-xs text-dream-text-muted/60 ml-auto">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  {item.message && (
                    <p className="text-sm text-dream-text leading-relaxed">
                      {item.message}
                    </p>
                  )}
                </div>
              ))
            )}

            {/* Pagination */}
            {donationData.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {page > 1 && (
                  <a
                    href={`/admin/feedback?secret=${secret}&tab=donations&page=${page - 1}`}
                    className="text-sm text-dream-accent hover:underline"
                  >
                    Previous
                  </a>
                )}
                <span className="text-sm text-dream-text-muted">
                  Page {page} of {donationData.totalPages}
                </span>
                {page < donationData.totalPages && (
                  <a
                    href={`/admin/feedback?secret=${secret}&tab=donations&page=${page + 1}`}
                    className="text-sm text-dream-accent hover:underline"
                  >
                    Next
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
