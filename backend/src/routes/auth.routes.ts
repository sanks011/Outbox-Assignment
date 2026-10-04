import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/google', AuthController.googleLogin);
router.post('/login', AuthController.login);
router.post('/demo', AuthController.demoLogin);
router.get('/me', authMiddleware, AuthController.getMe);

export default router;
