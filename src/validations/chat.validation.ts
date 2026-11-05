import { z } from 'zod';

export const createChatSchema = z
  .object({
    userAId: z
      .string({ message: 'userAId must be a string' })
      .uuid({ message: 'userAId must be a valid UUID' }),
    userBId: z
      .string({ message: 'userBId must be a string' })
      .uuid({ message: 'userBId must be a valid UUID' }),
  })
  .refine((data) => data.userAId !== data.userBId, {
    message: 'userAId and userBId must be different',
    path: ['userBId'],
  });

export type CreateChatInput = z.infer<typeof createChatSchema>;

export const sendMessageParamsSchema = z.object({
  chatId: z
    .string({ message: 'chatId must be a string' })
    .uuid({ message: 'chatId must be a valid UUID' }),
});

export const sendMessageBodySchema = z.object({
  senderId: z
    .string({ message: 'senderId must be a string' })
    .uuid({ message: 'senderId must be a valid UUID' }),
  text: z
    .string({ message: 'text must be a string' })
    .trim()
    .min(1, { message: 'Message text cannot be empty or whitespace only' })
    .max(5000, { message: 'Message text cannot exceed 5000 characters' }),
});

export type SendMessageParams = z.infer<typeof sendMessageParamsSchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;

export const getMessagesParamsSchema = z.object({
  chatId: z
    .string({ message: 'chatId must be a string' })
    .uuid({ message: 'chatId must be a valid UUID' }),
});

export const getMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default('50')
    .refine(
      (val) => {
        const parsed = parseInt(val, 10);
        return !isNaN(parsed) && parsed >= 1;
      },
      { message: 'limit must be a positive integer greater than 0' }
    )
    .transform((val) => Math.min(parseInt(val, 10), 100)),
  cursor: z.string().uuid({ message: 'cursor must be a valid UUID' }).optional(),
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }).optional(),
});

export type GetMessagesParams = z.infer<typeof getMessagesParamsSchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;

// STEP 8: Mark Message Read
export const markReadParamsSchema = z.object({
  chatId: z
    .string({ message: 'chatId must be a string' })
    .uuid({ message: 'chatId must be a valid UUID' }),
  messageId: z
    .string({ message: 'messageId must be a string' })
    .uuid({ message: 'messageId must be a valid UUID' }),
});

export const markReadBodySchema = z.object({
  userId: z
    .string({ message: 'userId must be a string' })
    .uuid({ message: 'userId must be a valid UUID' }),
});

export type MarkReadParams = z.infer<typeof markReadParamsSchema>;
export type MarkReadBody = z.infer<typeof markReadBodySchema>;

// STEP 9: Update Last Seen
export const updateLastSeenParamsSchema = z.object({
  chatId: z
    .string({ message: 'chatId must be a string' })
    .uuid({ message: 'chatId must be a valid UUID' }),
});

export const updateLastSeenBodySchema = z.object({
  userId: z
    .string({ message: 'userId must be a string' })
    .uuid({ message: 'userId must be a valid UUID' }),
  messageId: z
    .string({ message: 'messageId must be a string' })
    .uuid({ message: 'messageId must be a valid UUID' }),
});

export type UpdateLastSeenParams = z.infer<typeof updateLastSeenParamsSchema>;
export type UpdateLastSeenBody = z.infer<typeof updateLastSeenBodySchema>;

// STEP 10: List User Chats
export const listUserChatsParamsSchema = z.object({
  userId: z
    .string({ message: 'userId must be a string' })
    .uuid({ message: 'userId must be a valid UUID' }),
});

export const listUserChatsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .refine(
      (val) => {
        const parsed = parseInt(val, 10);
        return !isNaN(parsed) && parsed >= 1;
      },
      { message: 'page must be a positive integer greater than 0' }
    )
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .refine(
      (val) => {
        const parsed = parseInt(val, 10);
        return !isNaN(parsed) && parsed >= 1;
      },
      { message: 'limit must be a positive integer greater than 0' }
    )
    .transform((val) => Math.min(parseInt(val, 10), 100)),
});

export type ListUserChatsParams = z.infer<typeof listUserChatsParamsSchema>;
export type ListUserChatsQuery = z.infer<typeof listUserChatsQuerySchema>;
