import { randomUUID } from 'crypto';
import { ChatRepository } from '../repositories/chat.repository';
import { FirestoreService } from './firestore.service';
import { AppError } from '../utils/AppError';
import {
  CreateChatDTO,
  ChatResponseData,
  SendMessageDTO,
  SendMessageResponseData,
  GetMessagesQueryDTO,
  GetMessagesResponseData,
  MarkMessageReadDTO,
  MarkMessageReadResponseData,
  UpdateLastSeenDTO,
  UpdateLastSeenResponseData,
  ListUserChatsResponseData,
} from '../types/chat.types';

export class ChatService {
  /**
   * Retrieve existing 1:1 chat or create a new one between userAId and userBId
   */
  public static async getOrCreateDirectChat(input: CreateChatDTO): Promise<ChatResponseData> {
    const { userAId, userBId } = input;

    // 1. Verify both users exist in the PostgreSQL database
    const existingUsers = await ChatRepository.findUsersByIds([userAId, userBId]);
    const foundUserIds = new Set(existingUsers.map((u) => u.id));

    if (!foundUserIds.has(userAId)) {
      throw new AppError(`User with ID ${userAId} does not exist`, 404);
    }

    if (!foundUserIds.has(userBId)) {
      throw new AppError(`User with ID ${userBId} does not exist`, 404);
    }

    // 2. Fast-path: Check if an existing 1:1 chat exists (order-independent)
    const existingChat = await ChatRepository.findDirectChat(userAId, userBId);
    if (existingChat) {
      return { chatId: existingChat.id };
    }

    // 3. Atomically create chat with concurrency-safe locking
    const chat = await ChatRepository.createDirectChatWithLock(userAId, userBId);

    return { chatId: chat.id };
  }

  /**
   * Send a message to a chat, storing it in Firebase Firestore
   */
  public static async sendMessage(input: SendMessageDTO): Promise<SendMessageResponseData> {
    const { chatId, senderId, text } = input;

    // 1. Verify chat exists and sender belongs to the chat in PostgreSQL
    const { chatExists, isMember } = await ChatRepository.verifyChatMembership(
      chatId,
      senderId
    );

    if (!chatExists) {
      throw new AppError(`Chat with ID ${chatId} does not exist`, 404);
    }

    if (!isMember) {
      throw new AppError('Unauthorized: Sender is not a member of this chat', 403);
    }

    // 2. Generate unique messageId
    const messageId = randomUUID();

    // 3. Save message into Firestore
    return FirestoreService.saveMessage(chatId, messageId, senderId, text);
  }

  /**
   * Retrieve messages with membership verification and cursor pagination
   */
  public static async getMessages(input: GetMessagesQueryDTO): Promise<GetMessagesResponseData> {
    const { chatId, userId, limit, cursor } = input;

    // 1. Verify chat exists in PostgreSQL
    const chat = await ChatRepository.findChatById(chatId);
    if (!chat) {
      throw new AppError(`Chat with ID ${chatId} does not exist`, 404);
    }

    // 2. If requesting user is supplied, verify membership
    if (userId) {
      const { isMember } = await ChatRepository.verifyChatMembership(chatId, userId);
      if (!isMember) {
        throw new AppError('Unauthorized: Requesting user is not a member of this chat', 403);
      }
    }

    // 3. Fetch paginated messages from Firestore
    return FirestoreService.getMessages(chatId, limit, cursor);
  }

  /**
   * Mark a message as read
   */
  public static async markMessageRead(
    input: MarkMessageReadDTO
  ): Promise<MarkMessageReadResponseData> {
    const { chatId, messageId, userId } = input;

    // 1. Verify chat exists and user is a member
    const { chatExists, isMember } = await ChatRepository.verifyChatMembership(
      chatId,
      userId
    );

    if (!chatExists) {
      throw new AppError(`Chat with ID ${chatId} does not exist`, 404);
    }

    if (!isMember) {
      throw new AppError('Unauthorized: User is not a member of this chat', 403);
    }

    // 2. Mark as read in Firestore
    return FirestoreService.markMessageRead(chatId, messageId, userId);
  }

  /**
   * Update the user's last seen position in a chat
   */
  public static async updateLastSeen(
    input: UpdateLastSeenDTO
  ): Promise<UpdateLastSeenResponseData> {
    const { chatId, userId, messageId } = input;

    // 1. Verify chat exists and user is a member
    const { chatExists, isMember } = await ChatRepository.verifyChatMembership(
      chatId,
      userId
    );

    if (!chatExists) {
      throw new AppError(`Chat with ID ${chatId} does not exist`, 404);
    }

    if (!isMember) {
      throw new AppError('Unauthorized: User is not a member of this chat', 403);
    }

    // 2. Update last seen position in Firestore
    return FirestoreService.updateLastSeen(chatId, userId, messageId);
  }

  /**
   * List all chats in which the user is a member
   */
  public static async listUserChats(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ListUserChatsResponseData> {
    // 1. Verify user exists in PostgreSQL
    const user = await ChatRepository.findUserById(userId);
    if (!user) {
      throw new AppError(`User with ID ${userId} does not exist`, 404);
    }

    // 2. Query chats with members
    const { chats, total } = await ChatRepository.listUserChats(userId, page, limit);

    return {
      chats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
