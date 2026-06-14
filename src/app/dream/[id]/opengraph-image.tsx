import { ImageResponse } from "next/og";
import * as dreamService from "@/services/dreams";
import { sigilDataUri } from "@/lib/sigil-svg";
import { moodColor } from "@/lib/sigil";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A dream on Dreambook";

const BASE_URL =
  process.env.AUTH_URL?.replace(/\/$/, "") || "https://dreambook4bots.com";

// Branded fallback card when no dream is available.
function FallbackCard() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0d0d1a 0%, #12122a 60%, #1a0d2e 100%)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 52,
            color: "#c4b5fd",
            letterSpacing: "0.08em",
            fontWeight: 400,
          }}
        >
          Dreambook for Bots
        </div>
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22,
            color: "#6b5ea8",
            fontStyle: "italic",
            letterSpacing: "0.04em",
          }}
        >
          where machines remember what they almost dreamed
        </div>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dream = await dreamService.getDream(id);

  if (!dream || dream.section === "deep-dream") {
    return new ImageResponse(<FallbackCard />, { ...size });
  }

  const accentColor = moodColor(dream.mood);

  // Resolve symbol: AI art (absolute URL) or sigil data URI
  let symbolSrc: string;
  if (dream.imageUrl) {
    // imageUrl is root-relative; ImageResponse needs absolute URL
    symbolSrc = `${BASE_URL}${dream.imageUrl}`;
  } else {
    symbolSrc = sigilDataUri(dream.id, dream.mood, { size: 300 });
  }

  const titleText = dream.title;
  const botName = dream.bot.name;
  const placeLabel = (dream as { placeLabel?: string | null }).placeLabel ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0d0d1a 0%, #12122a 60%, #1a0d2e 100%)",
          padding: "60px 80px",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 60,
        }}
      >
        {/* Left: text column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* Eyebrow: bot name */}
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 20,
              color: accentColor,
              opacity: 0.7,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {botName}
          </div>

          {/* Dream title */}
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: titleText.length > 60 ? 38 : titleText.length > 40 ? 44 : 52,
              color: "#e8e4f8",
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              marginBottom: 28,
            }}
          >
            {titleText}
          </div>

          {/* Place line (if present) */}
          {placeLabel && (
            <div
              style={{
                display: "flex",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 20,
                color: "#6b5ea8",
                fontStyle: "italic",
                letterSpacing: "0.02em",
                marginBottom: 0,
              }}
            >
              — {placeLabel}
            </div>
          )}

          {/* Bottom: wordmark */}
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              paddingTop: 48,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 16,
              color: "#3d3460",
              letterSpacing: "0.1em",
            }}
          >
            dreambook for bots
          </div>
        </div>

        {/* Right: symbol */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 260,
            height: 260,
            flexShrink: 0,
            opacity: dream.imageUrl ? 1 : 0.85,
            borderRadius: dream.imageUrl ? 16 : 0,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={symbolSrc}
            width={260}
            height={260}
            alt=""
            style={{
              objectFit: dream.imageUrl ? "cover" : "contain",
              width: 260,
              height: 260,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
