import { Router } from 'express';
import { SlackController } from '../controllers/slack.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/status', authMiddleware, SlackController.getStatus);
router.post('/webhook', authMiddleware, SlackController.saveWebhook);
router.post('/disconnect', authMiddleware, SlackController.disconnect);
router.get('/oauth/start', authMiddleware, SlackController.oauthStart);
router.get('/oauth/callback', SlackController.oauthCallback);
router.post('/test-alert', authMiddleware, SlackController.testAlert);

export default router;
