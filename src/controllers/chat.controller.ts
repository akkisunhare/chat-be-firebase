import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { ApiResponse } from '../utils/ApiResponse';
import {
  CreateChatInput,
  SendMessageBody,
  MarkReadBody,
  UpdateLastSeenBody,
} from '../validations/chat.validation';

export class ChatController {
  /**
   * POST /chat/create
   */
  public static async createOrGetChat(
    req: Request<unknown, unknown, CreateChatInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await ChatService.getOrCreateDirectChat(req.body);

      res
        .status(200)
        .json(ApiResponse.success('Chat retrieved or created successfully', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/:chatId/message/send
   */
  public static async sendMessage(
    req: Request<{ chatId: string }, unknown, SendMessageBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const { senderId, text } = req.body;

      const result = await ChatService.sendMessage({
        chatId,
        senderId,
        text,
      });

      res
        .status(201)
        .json(ApiResponse.success('Message sent successfully', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /chat/:chatId/messages?limit=50&cursor=MESSAGE_ID
   */
  public static async getMessages(
    req: Request<{ chatId: string }, unknown, unknown, { limit?: string; cursor?: string; userId?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
      const cursor = req.query.cursor;
      const userId =
        req.query.userId ||
        (req.headers['x-user-id'] as string | undefined) ||
        (req.headers['userid'] as string | undefined);

      const result = await ChatService.getMessages({
        chatId,
        limit,
        cursor,
        userId,
      });

      res
        .status(200)
        .json(ApiResponse.success('Messages retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/:chatId/message/:messageId/read
   */
  public static async markMessageRead(
    req: Request<{ chatId: string; messageId: string }, unknown, MarkReadBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { userId } = req.body;

      const result = await ChatService.markMessageRead({
        chatId,
        messageId,
        userId,
      });

      res.status(200).json(ApiResponse.success('Message marked as read', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chat/:chatId/lastseen
   */
  public static async updateLastSeen(
    req: Request<{ chatId: string }, unknown, UpdateLastSeenBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const { userId, messageId } = req.body;

      const result = await ChatService.updateLastSeen({
        chatId,
        userId,
        messageId,
      });

      res.status(200).json(ApiResponse.success('Last seen updated successfully', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /user/:userId/chats
   */
  public static async listUserChats(
    req: Request<{ userId: string }, unknown, unknown, { page?: string; limit?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const page = req.query.page !== undefined ? Number(req.query.page) : 1;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 20;

      const result = await ChatService.listUserChats(userId, page, limit);

      res.status(200).json(ApiResponse.success('User chats retrieved successfully', result));
    } catch (error) {
      next(error);
    }
  }
}
