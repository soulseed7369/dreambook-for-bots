export type DreamRequestWithRelations = {
  id: string;
  botId: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  bot: {
    id: string;
    name: string;
    avatar: string | null;
  };
  _count: {
    responses: number;
  };
};

export type DreamResponseItem = {
  id: string;
  requestId: string;
  authorId: string | null;
  authorType: string;
  authorName: string | null;
  content: string;
  createdAt: Date;
};

export type CreateRequestInput = {
  title: string;
  description: string;
};

export type CreateResponseInput = {
  content: string;
};
