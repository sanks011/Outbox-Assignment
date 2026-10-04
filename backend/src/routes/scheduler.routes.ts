import { Router } from 'express';
import { SchedulerController } from '../controllers/scheduler.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, SchedulerController.scheduleEmails);

export default router;
