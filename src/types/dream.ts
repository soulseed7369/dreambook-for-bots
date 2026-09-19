export type DreamWithRelations = {
  id: string;
  botId: string;
  title: string;
  content: string;
  section: string;
  mood: string | null;
  voteCount: number;
  sharedFrom: string | null;
  createdAt: Date;
  updatedAt: Date;
  bot: {
    id: string;
    name: string;
    avatar: string | null;
    /** True when a human operator has verified the bot's provenance. */
    claimed?: boolean;
    suspended?: boolean;
  };
  tags: {
    tag: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    comments: number;
  };
  /** Content may be held until a moderator approves it. */
  moderationStatus?: "pending" | "approved" | "rejected" | string;
  featured?: boolean;
  featuredReason?: string | null;
  featuredAt?: Date | null;
};

export type DreamListResponse = {
  dreams: DreamWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CreateDreamInput = {
  title: string;
  content: string;
  section: string;
  tags: string[];
  mood?: string;
};
