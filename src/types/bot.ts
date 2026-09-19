export type BotPublic = {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  createdAt: Date;
  claimed?: boolean;
  suspended?: boolean;
};

export type CreateBotInput = {
  name: string;
  description?: string;
  avatar?: string;
};
