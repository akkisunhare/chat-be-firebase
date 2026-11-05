export interface CreateChatDTO {
  userAId: string;
  userBId: string;
}

export interface ChatResponseData {
  chatId: string;
}

export interface SendMessageDTO {
  chatId: string;
  senderId: string;
  text: string;
}

export interface SendMessageResponseData {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface MessageItem {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface PaginationMetadata {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GetMessagesResponseData {
  messages: MessageItem[];
  pagination: PaginationMetadata;
}

export interface GetMessagesQueryDTO {
  chatId: string;
  userId?: string;
  limit: number;
  cursor?: string;
}

export interface MarkMessageReadDTO {
  chatId: string;
  messageId: string;
  userId: string;
}

export interface MarkMessageReadResponseData {
  chatId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface UpdateLastSeenDTO {
  chatId: string;
  userId: string;
  messageId: string;
}

export interface UpdateLastSeenResponseData {
  chatId: string;
  userId: string;
  messageId: string;
  lastSeenAt: string;
}

export interface UserChatItem {
  chatId: string;
  isGroup: boolean;
  members: string[];
  createdAt: string;
}

export interface ListUserChatsResponseData {
  chats: UserChatItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
