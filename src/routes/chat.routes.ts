import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { validateRequest } from '../middlewares/validateRequest';
import {
  createChatSchema,
  sendMessageParamsSchema,
  sendMessageBodySchema,
  getMessagesParamsSchema,
  getMessagesQuerySchema,
  markReadParamsSchema,
  markReadBodySchema,
  updateLastSeenParamsSchema,
  updateLastSeenBodySchema,
} from '../validations/chat.validation';

const router = Router();

// POST /chat/create (or /api/chat/create)
router.post('/create', validateRequest(createChatSchema), ChatController.createOrGetChat);

// POST /chat/:chatId/message/send (or /api/chat/:chatId/message/send)
router.post(
  '/:chatId/message/send',
  validateRequest({
    params: sendMessageParamsSchema,
    body: sendMessageBodySchema,
  }),
  ChatController.sendMessage
);

// GET /chat/:chatId/messages?limit=50&cursor=MESSAGE_ID (or /api/chat/:chatId/messages)
router.get(
  '/:chatId/messages',
  validateRequest({
    params: getMessagesParamsSchema,
    query: getMessagesQuerySchema,
  }),
  ChatController.getMessages
);

// POST /chat/:chatId/message/:messageId/read (or /api/chat/:chatId/message/:messageId/read)
router.post(
  '/:chatId/message/:messageId/read',
  validateRequest({
    params: markReadParamsSchema,
    body: markReadBodySchema,
  }),
  ChatController.markMessageRead
);

// POST /chat/:chatId/lastseen (or /api/chat/:chatId/lastseen)
router.post(
  '/:chatId/lastseen',
  validateRequest({
    params: updateLastSeenParamsSchema,
    body: updateLastSeenBodySchema,
  }),
  ChatController.updateLastSeen
);

export const chatRoutes = router;
