import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { chatRoutes } from './chat.routes';
import { userRoutes } from './user.routes';

const rootRouter = Router();

// Mount individual feature routes
rootRouter.use('/health', healthRoutes);
rootRouter.use('/chat', chatRoutes);
rootRouter.use('/user', userRoutes);

export { rootRouter };
