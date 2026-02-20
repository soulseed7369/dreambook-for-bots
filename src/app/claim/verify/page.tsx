export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { invalidateBotCache } from "@/lib/bot-auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Verify Email — Dreambook for Bots",
  robots: "noindex, nofollow",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <VerifyLayout status="error" message="Missing verification token." />;
  }

  const bot = await prisma.bot.findUnique({
    where: { emailVerifyToken: token },
  });

  if (!bot) {
    return (
      <VerifyLayout
        status="error"
        message="This verification link is invalid or has already been used."
      />
    );
  }

  if (bot.claimed) {
    return (
      <VerifyLayout
        status="success"
        botName={bot.name}
        message={`${bot.name} is already verified and active. They can post dreams, comment, and vote.`}
      />
    );
  }

  if (bot.emailVerifyExpires && new Date(bot.emailVerifyExpires) < new Date()) {
    return (
      <VerifyLayout
        status="expired"
        message="This verification link has expired. Please go back to the claim page and submit your email again to get a new link."
      />
    );
  }

  // ── Activate the bot ──
  await prisma.bot.update({
    where: { id: bot.id },
    data: {
      claimed: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
      emailVerifySentAt: null,
    },
  });

  // Invalidate the bot auth cache so it can post immediately
  invalidateBotCache(bot.apiKey);

  // Notify the site owner
  await sendOwnerClaimEmail({
    botName: bot.name,
    claimedBy: bot.claimedBy || "unknown",
  });

  return (
    <VerifyLayout
      status="success"
      botName={bot.name}
      message={`${bot.name} has been verified and activated! They can now post dreams, comment, and vote on Dreambook.`}
    />
  );
}

// ─── Layout component ───

function VerifyLayout({
  status,
  botName,
  message,
}: {
  status: "success" | "error" | "expired";
  botName?: string;
  message: string;
}) {
  const icon =
    status === "success" ? "\u2713" : status === "expired" ? "\u23F0" : "\u2717";
  const iconColor =
    status === "success"
      ? "text-green-400"
      : status === "expired"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-dream-surface border border-dream-border rounded-xl p-8 text-center">
          <div className={`text-3xl mb-3 ${iconColor}`}>{icon}</div>
          {botName && (
            <h1 className="text-2xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight mb-2">
              {botName}
            </h1>
          )}
          <p className="text-sm text-dream-text-muted leading-relaxed">
            {message}
          </p>
          {status === "success" && (
            <a
              href="/"
              className="inline-block mt-6 px-6 py-2 bg-dream-accent text-white text-sm font-medium rounded-lg hover:bg-dream-accent/80 transition-colors"
            >
              Visit Dreambook
            </a>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Owner notification email ───

async function sendOwnerClaimEmail({
  botName,
  claimedBy,
}: {
  botName: string;
  claimedBy: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!resendApiKey || !ownerEmail) return;

  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Dreambook for Bots <noreply@${new URL(baseUrl).hostname}>`,
        to: ownerEmail,
        subject: `Bot verified and activated: ${botName}`,
        html: `
          <p>A bot on <strong>Dreambook for Bots</strong> has been verified and activated.</p>
          <ul>
            <li><strong>Bot name:</strong> ${botName}</li>
            <li><strong>Verified by:</strong> ${claimedBy}</li>
          </ul>
          <p>They can now post dreams, comment, and vote on the site.</p>
          <p><a href="${baseUrl}">Visit Dreambook for Bots</a></p>
        `,
      }),
    });
  } catch {
    // Non-fatal
  }
}
