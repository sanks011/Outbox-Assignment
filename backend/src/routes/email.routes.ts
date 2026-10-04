import { Router } from 'express';
import { EmailController } from '../controllers/email.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/scheduled', authMiddleware, EmailController.getScheduledEmails);
router.get('/sent', authMiddleware, EmailController.getSentEmails);
router.get('/search', authMiddleware, EmailController.searchEmails);
router.get('/senders', authMiddleware, EmailController.getSenders);
router.get('/detail/:id', authMiddleware, EmailController.getEmailDetail);
router.delete('/:id', authMiddleware, EmailController.cancelEmail);
router.post('/seed', authMiddleware, EmailController.seedSampleData);

export default router;
