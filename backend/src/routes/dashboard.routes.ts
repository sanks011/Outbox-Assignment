import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/stats', authMiddleware, DashboardController.getStats);

export default router;
