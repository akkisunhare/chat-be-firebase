import { prisma } from '../config/database';
import { UserChatItem } from '../types/chat.types';

export class ChatRepository {
  /**
   * Find a user by ID
   */
  public static async findUserById(userId: string): Promise<{ id: string } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  /**
   * Find users by an array of IDs
   */
  public static async findUsersByIds(userIds: string[]): Promise<{ id: string }[]> {
    return prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  /**
   * Find a chat by ID
   */
  public static async findChatById(chatId: string): Promise<{ id: string } | null> {
    return prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });
  }

  /**
   * Find an existing 1:1 chat between two users (order-independent)
   */
  public static async findDirectChat(
    userAId: string,
    userBId: string
  ): Promise<{ id: string } | null> {
    return prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            members: {
              some: {
                userId: userAId,
              },
            },
          },
          {
            members: {
              some: {
                userId: userBId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
  }

  /**
   * Atomically create a new 1:1 chat with concurrency protection using PostgreSQL advisory transaction lock
   */
  public static async createDirectChatWithLock(
    userAId: string,
    userBId: string
  ): Promise<{ id: string }> {
    const [firstId, secondId] = [userAId, userBId].sort();
    const lockKey = `direct_chat:${firstId}:${secondId}`;

    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const existing = await tx.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: userAId } } },
            { members: { some: { userId: userBId } } },
          ],
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        return existing;
      }

      const newChat = await tx.chat.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: userAId }, { userId: userBId }],
          },
        },
        select: {
          id: true,
        },
      });

      return newChat;
    });
  }

  /**
   * Verify chat existence and whether a user belongs to that chat in a single efficient query
   */
  public static async verifyChatMembership(
    chatId: string,
    userId: string
  ): Promise<{ chatExists: boolean; isMember: boolean }> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        members: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    if (!chat) {
      return { chatExists: false, isMember: false };
    }

    return { chatExists: true, isMember: chat.members.length > 0 };
  }

  /**
   * List all chats a user is a member of with pagination and zero N+1 queries
   */
  public static async listUserChats(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ chats: UserChatItem[]; total: number }> {
    const where = {
      members: {
        some: {
          userId,
        },
      },
    };

    const [total, chatsData] = await prisma.$transaction([
      prisma.chat.count({ where }),
      prisma.chat.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          isGroup: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    const chats: UserChatItem[] = chatsData.map((c) => ({
      chatId: c.id,
      isGroup: c.isGroup,
      members: c.members.map((m) => m.userId),
      createdAt: c.createdAt.toISOString(),
    }));

    return { chats, total };
  }
}
