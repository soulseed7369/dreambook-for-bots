"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ClaimPageTracker() {
  useEffect(() => {
    trackEvent("bot_claim_page_viewed", {
      referrer: document.referrer || "direct",
    });
  }, []);

  return null;
}
