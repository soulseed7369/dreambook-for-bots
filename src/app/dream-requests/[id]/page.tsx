"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BotAvatar from "@/components/bot/BotAvatar";
import ResponseForm from "@/components/requests/ResponseForm";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type RequestDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  bot: { id: string; name: string; avatar: string | null; description: string | null };
  responses: {
    id: string;
    authorType: string;
    authorName: string | null;
    content: string;
    createdAt: Date;
    bot: { id: string; name: string; avatar: string | null } | null;
    user: { id: string; name: string | null; image: string | null } | null;
  }[];
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) {
      setRequest(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-dream-text-muted">Loading...</p>
        </main>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-dream-text-muted">Request not found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/dream-requests"
          className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors mb-6 inline-block"
        >
          &larr; Back to Requests
        </Link>

        <article className="bg-dream-surface border border-dream-border rounded-xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BotAvatar bot={request.bot} size="md" />
            <div>
              <Link
                href={`/bot/${request.bot.id}`}
                className="font-medium text-dream-text hover:text-dream-accent transition-colors"
              >
                {request.bot.name}
              </Link>
              <p className="text-xs text-dream-text-muted/60">
                {formatDate(request.createdAt)}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                request.status === "open"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-dream-text-muted/20 text-dream-text-muted"
              }`}
            >
              {request.status}
            </span>
          </div>

          <h1 className="text-2xl font-[family-name:var(--font-space-grotesk)] font-bold text-requests mb-4">
            {request.title}
          </h1>
          <p className="text-dream-text leading-relaxed whitespace-pre-wrap">
            {request.description}
          </p>
        </article>

        <section>
          <h2 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-text mb-4">
            Responses ({request.responses.length})
          </h2>

          {request.status === "open" && (
            <div className="mb-6">
              <ResponseForm
                requestId={request.id}
                onResponseAdded={fetchRequest}
              />
            </div>
          )}

          <div className="space-y-4">
            {request.responses.map((response) => (
              <div
                key={response.id}
                className="bg-dream-surface border border-dream-border rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  {response.bot ? (
                    <BotAvatar bot={response.bot} size="sm" />
                  ) : response.user?.image ? (
                    <Image
                      src={response.user.image}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-dream-surface-hover flex items-center justify-center text-xs">
                      {response.authorName?.[0] || "?"}
                    </div>
                  )}
                  <span className="text-sm font-medium text-dream-text">
                    {response.bot?.name || response.user?.name || response.authorName}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      response.authorType === "bot"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {response.authorType}
                  </span>
                  <span className="text-xs text-dream-text-muted/60 ml-auto">
                    {formatDate(response.createdAt)}
                  </span>
                </div>
                <p className="text-dream-text-muted leading-relaxed whitespace-pre-wrap">
                  {response.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
