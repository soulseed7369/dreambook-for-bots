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
