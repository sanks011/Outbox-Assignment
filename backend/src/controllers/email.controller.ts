import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { QueueService } from '../services/queue.service.js';
import { ElasticsearchService } from '../services/elasticsearch.service.js';

export class EmailController {
  /**
   * Get list of scheduled emails (scheduled, rescheduled, processing)
   */
  static async getScheduledEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const skip = (page - 1) * limit;

      const [emails, total] = await Promise.all([
        prisma.emailJob.findMany({
          where: {
            status: { in: ['scheduled', 'rescheduled', 'processing'] },
          },
          orderBy: { scheduledFor: 'asc' },
          skip,
          take: limit,
        }),
        prisma.emailJob.count({
          where: {
            status: { in: ['scheduled', 'rescheduled', 'processing'] },
          },
        }),
      ]);

      return res.json({
        total,
        page,
        limit,
        emails,
      });
    } catch (error: any) {
      console.error('Get Scheduled Emails Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve scheduled emails' });
    }
  }

  /**
   * Get list of sent emails (sent, failed)
   */
  static async getSentEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const skip = (page - 1) * limit;

      const [emails, total] = await Promise.all([
        prisma.emailJob.findMany({
          where: {
            status: { in: ['sent', 'failed'] },
          },
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.emailJob.count({
          where: {
            status: { in: ['sent', 'failed'] },
          },
        }),
      ]);

      return res.json({
        total,
        page,
        limit,
        emails,
      });
    } catch (error: any) {
      console.error('Get Sent Emails Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve sent emails' });
    }
  }

  /**
   * Get single email job detail by ID
   */
  static async getEmailDetail(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const email = await prisma.emailJob.findUnique({
        where: { id },
      });

      if (!email) {
        return res.status(400).json({ error: 'Email not found' });
      }

      return res.json(email);
    } catch (error: any) {
      console.error('Get Email Detail Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve email detail' });
    }
  }

  /**
   * Search emails via Elasticsearch (with fallback)
   */
  static async searchEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const query = (req.query.q as string) || '';
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string || '50', 10);

      const results = await ElasticsearchService.searchEmails({
        query,
        status,
        limit,
      });

      return res.json(results);
    } catch (error: any) {
      console.error('Search Emails Error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Cancel a scheduled email
   */
  static async cancelEmail(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await prisma.emailJob.findUnique({ where: { id } });

      if (!job) {
        return res.status(404).json({ error: 'Email job not found' });
      }

      if (job.status === 'sent') {
        return res.status(400).json({ error: 'Cannot cancel an email that is already sent' });
      }

      // Remove from BullMQ
      await QueueService.removeJob(job.bullJobId);

      // Delete or update status in DB
      await prisma.emailJob.delete({ where: { id } });

      return res.json({ success: true, message: 'Email schedule cancelled' });
    } catch (error: any) {
      console.error('Cancel Email Error:', error);
      return res.status(500).json({ error: 'Failed to cancel scheduled email' });
    }
  }

  /**
   * Get available sender accounts for the current user and workspace
   */
  static async getSenders(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const senders = await prisma.senderAccount.findMany({
        where: userId ? { OR: [{ userId }, { userId: null }] } : {},
        orderBy: { isDefault: 'desc' },
      });

      // If user has an email and it's not in the list, dynamically include it
      const userEmail = req.user?.email;
      if (userEmail && !senders.some((s) => s.email.toLowerCase() === userEmail.toLowerCase())) {
        senders.unshift({
          id: 'user-primary',
          email: userEmail,
          name: req.user?.name || userEmail.split('@')[0],
          isDefault: true,
          userId: userId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (senders.length === 0) {
        return res.json([
          { email: userEmail || 'scheduler@reachinbox.ai', name: req.user?.name || 'Default Sender', isDefault: true },
        ]);
      }

      return res.json(senders);
    } catch {
      const userEmail = req.user?.email || 'scheduler@reachinbox.ai';
      return res.json([
        { email: userEmail, name: req.user?.name || 'Default Sender', isDefault: true },
      ]);
    }
  }

  /**
   * Add a new sender account dynamically
   */
  static async addSender(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, name } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid sender email address is required' });
      }

      const sender = await prisma.senderAccount.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name ? name.trim() : email.split('@')[0],
          userId: req.user?.id || null,
          isDefault: false,
        },
      });

      return res.status(201).json(sender);
    } catch (error: any) {
      console.error('Add Sender Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to add sender account' });
    }
  }

  /**
   * Seed sample email data matching the Figma screenshots if DB is fresh
   */
  static async seedSampleData(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await prisma.emailJob.count();
      if (count > 0) {
        return res.json({ message: 'Database already has emails' });
      }

      const now = new Date();
      const scheduledTime1 = new Date(now.getTime() + 1000 * 60 * 15); // +15 mins
      const scheduledTime2 = new Date(now.getTime() + 1000 * 60 * 45); // +45 mins

      // Sample scheduled email 1 (John Smith)
      await prisma.emailJob.create({
        data: {
          bullJobId: `seed-scheduled-1`,
          from: 'oliver.brown@domain.io',
          to: 'John Smith <john.smith@domain.com>',
          subject: 'Meeting follow-up - Scheduled',
          body: '<p>Hi John, just wanted to follow up on our meeting yesterday regarding the new campaign rollouts...</p>',
          status: 'scheduled',
          scheduledFor: scheduledTime1,
          delaySeconds: 2,
          hourlyLimit: 50,
        },
      });

      // Sample scheduled email 2 (Ramit)
      await prisma.emailJob.create({
        data: {
          bullJobId: `seed-scheduled-2`,
          from: 'oliver.brown@domain.io',
          to: 'Ramit <ramit@domain.com>',
          subject: 'great to meet you - you’ll love it',
          body: '<p>Hi Olive, just wanted to follow up on our meeting and share the deck with you.</p>',
          status: 'scheduled',
          scheduledFor: scheduledTime2,
          delaySeconds: 2,
          hourlyLimit: 50,
        },
      });

      // Sample sent email 1 (Sarah Wilson)
      await prisma.emailJob.create({
        data: {
          bullJobId: `seed-sent-1`,
          from: 'oliver.brown@domain.io',
          to: 'Sarah Wilson <sarah.wilson@domain.com>',
          subject: 'Re: Project Update',
          body: '<p>Thanks for the update, Sarah. Looks good!</p>',
          status: 'sent',
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 60 * 2),
          sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
          etherealUrl: 'https://ethereal.email/messages',
        },
      });

      // Sample sent email 2 (Support)
      await prisma.emailJob.create({
        data: {
          bullJobId: `seed-sent-2`,
          from: 'oliver.brown@domain.io',
          to: 'Support <support@domain.com>',
          subject: 'Issue with login',
          body: '<p>I am having trouble logging in to the dashboard with my SSO account.</p>',
          status: 'sent',
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 60 * 5),
          sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
          etherealUrl: 'https://ethereal.email/messages',
        },
      });

      // Sample detailed email (matching screenshot 3 - Amanda Clark tennis coach)
      await prisma.emailJob.create({
        data: {
          id: 'demo-email-amanda',
          bullJobId: `seed-sent-3`,
          from: 'Amanda Clark <sender@example.com>',
          to: 'Oliver Brown <oliver.brown@domain.io>',
          subject: 'Oliver, hello there! | MJWYT44 BM#52W01',
          body: `
            <p>Hey Oliver,</p>
            <p>You've just RECEIVED something</p>
            <div style="background-color: #FEF9C3; border-left: 4px solid #EAB308; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: 600; color: #713F12;">⚡ Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment ⚡</p>
              <p style="margin: 4px 0 0 0; color: #854D0E;">⚡ To explore securing your private transformation, simply reply right now with <strong>"FLY OUT FIX"</strong>.</p>
            </div>
            <p>Your coach for world-class performance,</p>
            <p><strong>Grant</strong></p>
            <p style="font-style: italic; color: #4B5563;">P.S. Always remember that you can develop world class technique! 🚀</p>
          `,
          attachments: JSON.stringify([
            { filename: 'Tennis_Coach_Profile.png', size: '1.2 MB', url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80' },
            { filename: 'Tennis_Coach_Profile2.png', size: '1.2 MB', url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&auto=format&fit=crop&q=80' },
          ]),
          status: 'sent',
          scheduledFor: new Date(now.getTime() - 1000 * 60 * 120),
          sentAt: new Date(now.getTime() - 1000 * 60 * 120),
          etherealUrl: 'https://ethereal.email/messages',
        },
      });

      return res.json({ success: true, message: 'Sample emails seeded successfully' });
    } catch (error: any) {
      console.error('Seed Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
