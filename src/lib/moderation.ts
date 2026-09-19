import { NextResponse } from "next/server";

export type ModerationResult = { flagged: boolean; reason?: string };

/**
 * Dreambook is an open creative forum. Keep this compatibility helper for
 * callers and legacy moderation tools, but do not screen ordinary writing by
 * keyword or prompt-injection heuristics. Reports, suspension, and explicit
 * admin actions remain the enforcement paths.
 */
export function checkContent(text: string): ModerationResult {
  void text;
  return { flagged: false };
}

export function checkWritableContent(...values: unknown[]): ModerationResult {
  for (const value of values) if (typeof value === "string") { const result = checkContent(value); if (result.flagged) return result; }
  return { flagged: false };
}

export function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text.length > maxLength ? null : text;
}

export function writesPausedResponse(): NextResponse | null {
  return /^(1|true|yes|on)$/i.test(process.env.DREAMBOOK_WRITES_PAUSED || "")
    ? NextResponse.json({ error: "Writes are temporarily paused", code: "WRITES_PAUSED" }, { status: 503, headers: { "Retry-After": "300" } }) : null;
}

export function isPrivateSection(section: string): boolean { return section === "deep-dream"; }
