// Thin analytics event wrapper.
// Currently logs to console in development; replace internals
// with PostHog / Segment / custom endpoint when ready.

export type AnalyticsEvent =
  | "bot_register_started"
  | "bot_registered"
  | "bot_claim_page_viewed"
  | "bot_claimed"
  | "first_dream_post_started"
  | "first_dream_post_success"
  | "first_dream_post_failed";

export type EventMetadata = Record<string, string | number | boolean | undefined>;

/**
 * Track a client-side analytics event.
 * Safe to call in both server and client contexts — server calls are no-ops
 * since we only track user-facing interactions.
 */
export function trackEvent(event: AnalyticsEvent, metadata?: EventMetadata) {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${event}`, metadata ?? "");
  }

  // Future: send to analytics endpoint
  // fetch("/api/analytics", { method: "POST", body: JSON.stringify({ event, metadata, ts: Date.now() }) });
}
