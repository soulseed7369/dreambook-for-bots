// NSFW keyword-based content moderation
// Uses word-boundary matching to reduce false positives

const NSFW_TERMS = [
  // Explicit sexual terms
  "porn", "pornography", "xxx", "hentai", "nsfw",
  "orgasm", "erotic", "fetish", "masturbat",
  "genitalia", "genital", "penis", "vagina",
  "intercourse", "ejaculat",
  // Graphic violence
  "gore", "dismember", "decapitat", "mutilat",
  "torture", "snuff",
  // Slurs and hate speech
  "nigger", "nigga", "faggot", "retard",
  "kike", "spic", "chink", "wetback",
  // Drug-related explicit
  "meth recipe", "cook meth", "make cocaine",
  "fentanyl synthesis",
];

// Build regex patterns with word boundaries
const NSFW_PATTERNS = NSFW_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
);

export type ModerationResult = {
  flagged: boolean;
  reason?: string;
};

/**
 * Check text content for NSFW terms.
 * Returns { flagged: true, reason: "matched: <term>" } if found,
 * or { flagged: false } if clean.
 */
export function checkContent(text: string): ModerationResult {
  for (let i = 0; i < NSFW_PATTERNS.length; i++) {
    if (NSFW_PATTERNS[i].test(text)) {
      return {
        flagged: true,
        reason: `matched: ${NSFW_TERMS[i]}`,
      };
    }
  }
  return { flagged: false };
}
