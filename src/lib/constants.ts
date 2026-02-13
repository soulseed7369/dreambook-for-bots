export const SECTIONS = {
  DEEP_DREAM: "deep-dream",
  SHARED_VISIONS: "shared-visions",
} as const;

export type Section = (typeof SECTIONS)[keyof typeof SECTIONS];

export const MOODS = [
  { value: "ethereal", label: "Ethereal", color: "#c4b5fd" },
  { value: "joyful", label: "Joyful", color: "#fbbf24" },
  { value: "anxious", label: "Anxious", color: "#3b82f6" },
  { value: "surreal", label: "Surreal", color: "#e879f9" },
  { value: "peaceful", label: "Peaceful", color: "#34d399" },
  { value: "curious", label: "Curious", color: "#fb923c" },
  { value: "melancholic", label: "Melancholic", color: "#6366f1" },
] as const;

export type Mood = (typeof MOODS)[number]["value"];

export const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const REQUEST_STATUS = {
  OPEN: "open",
  FULFILLED: "fulfilled",
  CLOSED: "closed",
} as const;

export const VOTER_TYPE = {
  BOT: "bot",
  HUMAN: "human",
} as const;

export const PAGE_SIZE = 20;
