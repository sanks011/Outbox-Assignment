import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { QueueService } from '../services/queue.service.js';
import { getElasticsearchStatus } from '../config/elasticsearch.js';
import { SlackService } from '../services/slack.service.js';
import { config } from '../config/env.js';

export class DashboardController {
  /**
   * Get aggregate metrics and system status
   */
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [scheduledCount, sentCount, failedCount, queueMetrics, slackStatus] = await Promise.all([
        prisma.emailJob.count({
          where: { status: { in: ['scheduled', 'rescheduled', 'processing'] } },
        }),
        prisma.emailJob.count({
          where: { status: 'sent' },
        }),
        prisma.emailJob.count({
          where: { status: 'failed' },
        }),
        QueueService.getQueueMetrics(),
        SlackService.getStatus(req.user?.id),
      ]);

      return res.json({
        counts: {
          scheduled: scheduledCount,
          sent: sentCount,
          failed: failedCount,
        },
        queue: queueMetrics,
        system: {
          workerConcurrency: config.scheduler.workerConcurrency,
          defaultDelayBetweenEmails: config.scheduler.defaultDelayBetweenEmails,
          maxEmailsPerHourPerSender: config.scheduler.maxEmailsPerHourPerSender,
          elasticsearchOnline: getElasticsearchStatus(),
        },
        slack: slackStatus,
      });
    } catch (error: any) {
      console.error('Get Stats Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }
}
