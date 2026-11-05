import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { validateRequest } from '../middlewares/validateRequest';
import {
  listUserChatsParamsSchema,
  listUserChatsQuerySchema,
} from '../validations/chat.validation';

const router = Router();

// GET /user/:userId/chats (or /api/user/:userId/chats)
router.get(
  '/:userId/chats',
  validateRequest({
    params: listUserChatsParamsSchema,
    query: listUserChatsQuerySchema,
  }),
  ChatController.listUserChats
);

export const userRoutes = router;

