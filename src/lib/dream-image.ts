/**
 * Dream image generation — provider chain:
 *   1. Local M1 model (primary, OpenAI Images API compatible)
 *   2. OpenRouter fallback (chat completions with image modality)
 *
 * NEVER throws out of generateAndStoreDreamImage.
 * Each provider is skipped when its env vars are unset and wrapped in try/catch.
 */

import { updateDreamImage } from "@/services/dreams";
import { storeImage } from "@/lib/image-storage";

function buildPrompt(dream: {
  title: string;
  content: string;
  mood?: string | null;
  tags?: string[];
}): string {
  const mood = dream.mood || "ethereal";
  const themes = dream.tags?.join(", ") || "—";
  // Keep content out of the prompt to avoid leaking long text; title+mood+tags is enough
  return (
    `Symbolic tarot-style dream glyph. Mood: ${mood}. Themes: ${themes}. ` +
    `Title: "${dream.title}". ` +
    `A single luminous emblem on a dark contemplative ground, sigil/iconography, ` +
    `no text, no words, centered, mystical, minimal.`
  );
}

async function tryLocalProvider(prompt: string): Promise<Buffer | null> {
  const baseUrl = process.env.IMAGE_LOCAL_BASE_URL;
  if (!baseUrl) return null;

  const model = process.env.IMAGE_LOCAL_MODEL || "dall-e-3";
  const apiKey = process.env.IMAGE_LOCAL_API_KEY;

  // Local generation can be slow on a cold model load (the mflux CLI reloads
  // weights per call), so the local timeout is generous and configurable.
  const localTimeoutMs = Number(process.env.IMAGE_LOCAL_TIMEOUT_MS) || 180_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), localTimeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[dream-image] Local provider responded ${res.status}`);
      return null;
    }

    const json = await res.json() as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn("[dream-image] Local provider: no b64_json in response");
      return null;
    }

    return Buffer.from(b64, "base64");
  } catch (err) {
    console.warn("[dream-image] Local provider error:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryOpenRouterFallback(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.IMAGE_FALLBACK_API_KEY;
  if (!apiKey) return null;

  const base = process.env.IMAGE_FALLBACK_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.IMAGE_FALLBACK_MODEL || "google/gemini-2.5-flash-image";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[dream-image] OpenRouter fallback responded ${res.status}`);
      return null;
    }

    const json = await res.json() as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
          content?: string | Array<{ type?: string; image_url?: { url?: string } }>;
        };
      }>;
    };

    const message = json?.choices?.[0]?.message;
    if (!message) {
      console.warn("[dream-image] OpenRouter fallback: no message in response");
      return null;
    }

    // Primary path: message.images array (documented response format)
    let dataUrl: string | undefined;
    if (message.images && message.images.length > 0) {
      dataUrl = message.images[0]?.image_url?.url;
    }

    // Fallback path: image embedded in content parts
    if (!dataUrl && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part?.type === "image_url" && part?.image_url?.url) {
          dataUrl = part.image_url.url;
          break;
        }
      }
    }

    if (!dataUrl) {
      console.warn("[dream-image] OpenRouter fallback: no image data URL found in response");
      return null;
    }

    // Strip "data:image/...;base64," prefix
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) {
      console.warn("[dream-image] OpenRouter fallback: malformed data URL");
      return null;
    }

    return Buffer.from(dataUrl.slice(commaIdx + 1), "base64");
  } catch (err) {
    console.warn("[dream-image] OpenRouter fallback error:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAndStoreDreamImage(dream: {
  id: string;
  title: string;
  content: string;
  mood?: string | null;
  tags?: string[];
}): Promise<void> {
  try {
    const prompt = buildPrompt(dream);

    // Provider chain — first success wins
    let bytes: Buffer | null = null;

    bytes = await tryLocalProvider(prompt);

    if (!bytes) {
      bytes = await tryOpenRouterFallback(prompt);
    }

    if (!bytes) {
      console.warn(`[dream-image] No provider succeeded for dream ${dream.id}; sigil remains.`);
      return;
    }

    const url = await storeImage(dream.id, bytes, "png");
    await updateDreamImage(dream.id, url);
  } catch (err) {
    console.error("[dream-image] Unexpected error:", err instanceof Error ? err.message : err);
    // Never throw — caller is fire-and-forget
  }
}
