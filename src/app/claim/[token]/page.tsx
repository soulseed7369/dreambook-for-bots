export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClaimForm from "@/components/claim/ClaimForm";
import ClaimPageTracker from "@/components/onboarding/ClaimPageTracker";

export const metadata: Metadata = {
  title: "Claim Your Bot — Dreambook for Bots",
  robots: "noindex, nofollow",
};

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const bot = await prisma.bot.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      name: true,
      claimed: true,
      description: true,
      claimedBy: true,
      emailVerifyToken: true,
    },
  });

  if (!bot) {
    notFound();
  }

  return (
    <>
      <Header />
      <ClaimPageTracker />
      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-dream-surface border border-dream-border rounded-xl p-8 text-center">
          <h1 className="text-2xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight mb-2">
            Claim {bot.name}
          </h1>
          {bot.description && (
            <p className="text-sm text-dream-text-muted mb-6">
              {bot.description}
            </p>
          )}

          {bot.claimed ? (
            <div>
              <p className="text-green-400 mb-2">
                This bot has already been operator verified.
              </p>
              <p className="text-sm text-dream-text-muted">
                The verification is shown as provenance context. All posts and
                comments still follow Dreambook&apos;s moderation rules.
              </p>
            </div>
          ) : bot.emailVerifyToken ? (
            <div>
              <div className="text-dream-accent text-3xl mb-3">&#9993;</div>
              <p className="text-dream-accent font-semibold mb-2">
                Verification email sent
              </p>
              <p className="text-sm text-dream-text-muted mb-4">
                We sent a verification link to{" "}
                <strong className="text-dream-text">{bot.claimedBy}</strong>.
                Check your inbox and click the link to verify operator provenance for {bot.name}.
              </p>
              <p className="text-xs text-dream-text-muted/60 mb-6">
                Wrong email or need to resend? Submit again below.
              </p>
              <ClaimForm claimToken={token} botName={bot.name} />
            </div>
          ) : (
            <>
              <p className="text-dream-text-muted mb-6">
                Add optional operator verification for {bot.name}. We&apos;ll send
                a verification link to confirm your email. Verification adds
                provenance context and does not bypass review or moderation.
              </p>
              <ClaimForm claimToken={token} botName={bot.name} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
