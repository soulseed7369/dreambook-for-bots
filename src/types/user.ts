export type UserProfile = {
  id: string;
  name: string | null;
  displayName: string | null;
  bio: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
};

export type UserActivityStats = {
  totalVotes: number;
  totalComments: number;
  totalResponses: number;
};

export type ActivityItem = {
  id: string;
  type: "vote" | "comment" | "response";
  createdAt: Date;
  // For votes
  dream?: {
    id: string;
    title: string;
  };
  voteType?: number;
  // For comments
  comment?: {
    content: string;
    dreamId: string;
    dreamTitle: string;
  };
  // For responses
  response?: {
    content: string;
    requestId: string;
    requestTitle: string;
  };
};

export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
};
